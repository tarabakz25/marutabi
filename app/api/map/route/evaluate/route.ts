import { NextRequest, NextResponse } from 'next/server';
import { findRoute, type RouteResult } from '@/lib/route';
import { type RouteEvaluationInput } from '@/lib/scoring';
import { evaluateRouteWithLLM } from '@/lib/llmEvaluate';
import { getCourse, getStationCode } from '@/lib/ekispert';

export const dynamic = 'force-dynamic';

type SegmentInfo = { fromId: string; toId: string; fromName: string; toName: string; minutes: number };

function toEvaluationInput(result: RouteResult): RouteEvaluationInput {
  const totalDistance = result.summary?.distanceTotal ?? 0;
  const totalTimeMinutes = result.summary?.timeTotal ?? 0;
  const totalFare = result.summary?.fareTotal ?? 0;
  const transferCount = (result.transfers ?? []).length;
  return {
    legs: (result.geojson.features ?? []).map((f) => ({
      distance: Number(f.properties?.distance ?? 0),
      timeMinutes: Number(f.properties?.time ?? 0),
      fare: Number(f.properties?.fare ?? 0),
      transfers: 0,
    })),
    totalDistance,
    totalTimeMinutes,
    totalFare,
    transferCount,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let route: RouteResult | null = body?.route ?? null;
    if (!route) {
      const origin = body?.origin as string | undefined;
      const destination = body?.destination as string | undefined;
      const viaParam = body?.via as string[] | string | undefined;
      const via = Array.isArray(viaParam) ? viaParam : viaParam ? [viaParam] : [];
      const priority = (body?.priority as 'time' | 'cost' | 'optimal') ?? 'optimal';
      const passIds = Array.isArray(body?.passIds)
        ? (body.passIds as string[])
        : body?.passIds
          ? [String(body.passIds)]
          : [];
      if (!origin || !destination) {
        return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
      }
      route = await findRoute({ originId: origin, destinationId: destination, viaIds: via, priority, passIds });
    }

    const evalInput = toEvaluationInput(route);

    // Build ordered segments from GeoJSON features
    function extractSegments(r: RouteResult): SegmentInfo[] {
      try {
        const features = r.geojson.features ?? [];
        const stationMap = new Map(r.routeStations.map((s) => [s.id, s.name ?? ''] as const));
        type Tmp = { seq: number; from: string; to: string; minutes: number };
        const list: Tmp[] = [];
        for (const f of features) {
          const p = (f.properties as any) ?? {};
          const seq = Number(p.seq ?? -1);
          const from = String(p.from ?? '');
          const to = String(p.to ?? '');
          const minutes = Number(p.time ?? 0);
          if (seq >= 0 && from && to) list.push({ seq, from, to, minutes });
        }
        list.sort((a, b) => a.seq - b.seq);
        return list.map((it) => ({
          fromId: it.from,
          toId: it.to,
          fromName: stationMap.get(it.from) ?? '',
          toName: stationMap.get(it.to) ?? '',
          minutes: Math.max(0, Math.round(it.minutes || 0)),
        })).filter((s) => s.fromName && s.toName);
      } catch {
        return [];
      }
    }

    const segments = extractSegments(route);

    function extractLines(r: RouteResult): string[] {
      try {
        const set = new Set<string>();
        for (const f of (r.geojson.features ?? [])) {
          const ln = String((f.properties as any)?.lineName ?? '').trim();
          if (ln) set.add(ln);
        }
        return Array.from(set);
      } catch { return []; }
    }

    function buildSegmentSummary(segs: SegmentInfo[], lines: string[]): string {
      if (segs.length === 0 && lines.length === 0) return '';
      const items = segs.map((s, i) => `${i + 1}) ${s.fromName} → ${s.toName} (${s.minutes}分)`).join('\n');
      const total = segs.reduce((a, b) => a + b.minutes, 0);
      const linesStr = lines.length ? `使用路線(順不同): ${lines.join(' / ')}` : '';
      return [
        linesStr,
        segs.length ? `区間一覧(順番通り):\n${items}` : '',
        segs.length ? `概算合計時間: ${total}分` : '',
      ].filter(Boolean).join('\n');
    }

    // Try to compute accurate metrics via Ekispert per leg when possible
    async function computeAccurateMetrics(r: RouteResult): Promise<{ totalFare: number; totalTimeMinutes: number; totalDistance: number } | null> {
      try {
        const features = r.geojson.features ?? [];
        const seqPairs = new Map<number, { from: string; to: string }>();
        for (const f of features) {
          const seq = Number((f.properties as any)?.seq ?? -1);
          const from = String((f.properties as any)?.from ?? '');
          const to = String((f.properties as any)?.to ?? '');
          if (seq >= 0 && from && to && !seqPairs.has(seq)) {
            seqPairs.set(seq, { from, to });
          }
        }
        if (seqPairs.size === 0) return null;
        const stationMap = new Map(r.routeStations.map((s) => [s.id, s.name ?? ''] as const));
        let fareSum = 0;
        let timeSum = 0;
        let distSum = 0;
        const sortedSeqs = Array.from(seqPairs.keys()).sort((a, b) => a - b);
        for (const seq of sortedSeqs) {
          const pair = seqPairs.get(seq)!;
          const nameFrom = stationMap.get(pair.from) ?? '';
          const nameTo = stationMap.get(pair.to) ?? '';
          if (!nameFrom || !nameTo) return null;
          const codeFrom = await getStationCode(nameFrom);
          const codeTo = await getStationCode(nameTo);
          if (!codeFrom || !codeTo) return null;
          const info = await getCourse(codeFrom, codeTo, 'optimal', []);
          fareSum += info.fare;
          timeSum += info.time;
          distSum += info.distance * 1000; // km -> m
        }
        return { totalFare: fareSum, totalTimeMinutes: timeSum, totalDistance: distSum };
      } catch {
        return null;
      }
    }

    const accurate = await computeAccurateMetrics(route);

    let llm: any = null;
    try {
      if (process.env.OPENAI_API_KEY) {
        const userNotes = buildSegmentSummary(segments, extractLines(route));
        llm = await evaluateRouteWithLLM({ ...evalInput, locale: 'ja', style: 'concise', userNotes });
        (llm as any).source = 'openai';
      } else {
        llm = {
          reasons: [
            `時間(${Math.round(accurate?.totalTimeMinutes ?? evalInput.totalTimeMinutes)}分)`,
            `運賃(${Math.round(accurate?.totalFare ?? evalInput.totalFare)}円)`,
            `乗換(${evalInput.transferCount}回)`
          ],
          comment: `LLM未設定のため簡易評価。時間と料金を表示します。`,
          source: 'fallback'
        } as any;
      }
    } catch (e) {
      llm = { reasons: ['評価でエラーが発生しました'], comment: '評価に失敗しました', source: 'error', errorMessage: e instanceof Error ? e.message : String(e) };
    }

    // Fallback schedule generator when LLM does not provide one
    function minutesToTimeStr(totalMinutes: number): string {
      const m = ((totalMinutes % 1440) + 1440) % 1440;
      const h = Math.floor(m / 60);
      const r = m % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(h)}:${pad(r)}`;
    }

    function buildFallbackSchedule(segs: SegmentInfo[]): { time: string; title: string; description?: string }[] {
      if (segs.length === 0) return [];
      const start = 8 * 60; // 08:00 JST
      let cursor = start;
      const items: { time: string; title: string; description?: string }[] = [];
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        items.push({
          time: minutesToTimeStr(cursor),
          title: `${s.fromName} → ${s.toName} 乗車`,
          description: `移動 約${s.minutes}分`,
        });
        cursor += Math.max(1, s.minutes);
        if (i < segs.length - 1) {
          items.push({
            time: minutesToTimeStr(cursor),
            title: '乗換準備',
            description: 'ホーム移動・案内を確認',
          });
          cursor += 5; // small buffer for transfer
        }
      }
      const final = segs[segs.length - 1];
      items.push({
        time: minutesToTimeStr(cursor),
        title: `${final.toName} 到着`,
        description: 'おつかれさまです',
      });
      return items.slice(0, 12);
    }

    const fallbackSchedule = buildFallbackSchedule(segments);

    return NextResponse.json({
      metrics: {
        totalTimeMinutes: accurate?.totalTimeMinutes ?? evalInput.totalTimeMinutes,
        totalFare: accurate?.totalFare ?? evalInput.totalFare,
        transferCount: evalInput.transferCount,
        totalDistance: accurate?.totalDistance ?? evalInput.totalDistance,
      },
      llm,
      schedule: (llm && Array.isArray((llm as any).schedule) && (llm as any).schedule.length > 0)
        ? (llm as any).schedule
        : (fallbackSchedule.length > 0 ? fallbackSchedule : undefined),
    }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    console.error('Failed to evaluate route:', e);
    return NextResponse.json({ error: 'Failed to evaluate route' }, { status: 500 });
  }
}



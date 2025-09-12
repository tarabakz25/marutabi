import { NextRequest, NextResponse } from 'next/server';
import { findRoute, type RouteResult } from '@/lib/route';
import { type RouteEvaluationInput } from '@/lib/scoring';
import { evaluateRouteWithLLM } from '@/lib/llmEvaluate';
import { getCourse, getStationCode } from '@/lib/ekispert';

export const dynamic = 'force-dynamic';

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
        llm = await evaluateRouteWithLLM({ ...evalInput, locale: 'ja', style: 'concise' });
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

    return NextResponse.json({
      metrics: {
        totalTimeMinutes: accurate?.totalTimeMinutes ?? evalInput.totalTimeMinutes,
        totalFare: accurate?.totalFare ?? evalInput.totalFare,
        transferCount: evalInput.transferCount,
        totalDistance: accurate?.totalDistance ?? evalInput.totalDistance,
      },
      llm,
    }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    console.error('Failed to evaluate route:', e);
    return NextResponse.json({ error: 'Failed to evaluate route' }, { status: 500 });
  }
}



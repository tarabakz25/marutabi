import { NextRequest, NextResponse } from 'next/server';
import { findRoute } from '@/lib/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let origin = searchParams.get('origin');
    let destination = searchParams.get('destination');
    let via = searchParams.getAll('via');
    const passIdsParam = searchParams.getAll('passId');
    // 座標文字列 "lon,lat" が来た場合は最近傍駅に正規化
    const coordRegex = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
    // 動的インポートでビルド時の静的解析エラーを回避
    const mod = await import('@/lib/route');
    const nearestFn: undefined | ((pos: [number, number]) => Promise<string | null>) = (mod as any).findNearestStationIdFromPosition;
    if (origin && coordRegex.test(origin)) {
      const [lon, lat] = origin.split(',').map((s) => Number(s));
      const sid = nearestFn ? await nearestFn([lon, lat]) : null;
      if (sid) origin = sid;
    }
    if (destination && coordRegex.test(destination)) {
      const [lon, lat] = destination.split(',').map((s) => Number(s));
      const sid = nearestFn ? await nearestFn([lon, lat]) : null;
      if (sid) destination = sid;
    }
    if (via && via.length > 0) {
      const mapped = await Promise.all(via.map(async (v) => {
        if (!v || !coordRegex.test(v)) return v;
        const [lon, lat] = v.split(',').map((s) => Number(s));
        return nearestFn ? ((await nearestFn([lon, lat])) ?? v) : v;
      }));
      via = mapped;
    }
    console.time('findRoute');
    console.log('[route] start', { origin, destination, via });
    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }
    const priority = (searchParams.get('priority') as 'time' | 'cost' | 'optimal') ?? 'optimal';
    let result;
    try {
      result = await findRoute({
        originId: origin,
        destinationId: destination,
        viaIds: via,
        priority,
        passIds: passIdsParam,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No path found')) {
        return NextResponse.json({ error: 'ルートが見つかりませんでした' }, { status: 404 });
      }
      if (msg.includes('Unknown station id')) {
        return NextResponse.json({ error: '駅IDが不正です' }, { status: 422 });
      }
      throw err;
    }
    console.timeEnd('findRoute');
    console.log('[route] done', { summary: result.summary });
    return NextResponse.json(result.geojson, {
      headers: { 'content-type': 'application/geo+json; charset=utf-8' },
    });
  } catch (e) {
    console.error('Failed to calculate route:', e);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let origin = body?.origin as string | undefined;
    let destination = body?.destination as string | undefined;
    const originPos = body?.originPos as [number, number] | undefined;
    const destPos = body?.destinationPos as [number, number] | undefined;
    if (!origin && originPos) origin = `${originPos[0]},${originPos[1]}`;
    if (!destination && destPos) destination = `${destPos[0]},${destPos[1]}`;
    const viaParam = body?.via as string[] | string | undefined;
    let via = Array.isArray(viaParam) ? viaParam : viaParam ? [viaParam] : [];
    const passIds = Array.isArray(body?.passIds)
      ? (body.passIds as string[])
      : body?.passIds
        ? [String(body.passIds)]
        : [];
    // 座標文字列の場合は最近傍駅に正規化
    const coordRegex = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
    const mod = await import('@/lib/route');
    const nearestFn: undefined | ((pos: [number, number]) => Promise<string | null>) = (mod as any).findNearestStationIdFromPosition;
    if (origin && coordRegex.test(origin)) {
      const [lon, lat] = origin.split(',').map((s) => Number(s));
      const sid = nearestFn ? await nearestFn([lon, lat]) : null;
      if (sid) origin = sid;
    }
    if (destination && coordRegex.test(destination)) {
      const [lon, lat] = destination.split(',').map((s) => Number(s));
      const sid = nearestFn ? await nearestFn([lon, lat]) : null;
      if (sid) destination = sid;
    }
    if (via && via.length > 0) {
      const mapped = await Promise.all(via.map(async (v: string) => {
        if (!v || !coordRegex.test(v)) return v;
        const [lon, lat] = v.split(',').map((s) => Number(s));
        return nearestFn ? ((await nearestFn([lon, lat])) ?? v) : v;
      }));
      via = mapped;
    }

    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }
    const priority = (body?.priority as 'time' | 'cost' | 'optimal') ?? 'optimal';
    try {
      const result = await findRoute({
        originId: origin,
        destinationId: destination,
        viaIds: via,
        priority,
        passIds,
      });
      return NextResponse.json(result, {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No path found')) {
        return NextResponse.json({ error: 'ルートが見つかりませんでした' }, { status: 404 });
      }
      if (msg.includes('Unknown station id')) {
        return NextResponse.json({ error: '駅IDが不正です' }, { status: 422 });
      }
      throw err;
    }
  } catch (e) {
    console.error('Failed to calculate route:', e);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { findRoute, type RouteResult } from '@/lib/route';
import { computeCompositeScore, type RouteEvaluationInput } from '@/lib/scoring';
import { evaluateRouteWithLLM } from '@/lib/llmEvaluate';

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
    const composite = computeCompositeScore(evalInput);

    let llm: any = null;
    try {
      if (process.env.OPENAI_API_KEY) {
        llm = await evaluateRouteWithLLM({ ...evalInput, locale: 'ja', style: 'concise' });
        (llm as any).source = 'openai';
      } else {
        // Fallback minimal comment without LLM
        llm = {
          score: composite.score,
          reasons: [
            `時間(${Math.round(evalInput.totalTimeMinutes)}分)`,
            `運賃(${Math.round(evalInput.totalFare)}円)`,
            `乗換(${evalInput.transferCount}回)`
          ],
          comment: `LLM未設定のため簡易評価。総合スコアは${composite.score}です。`,
          source: 'fallback'
        };
      }
    } catch (e) {
      llm = { score: composite.score, reasons: ['評価でエラーが発生しました'], comment: `総合スコアは${composite.score}です。`, source: 'error', errorMessage: e instanceof Error ? e.message : String(e) };
    }

    return NextResponse.json({ composite, llm }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    console.error('Failed to evaluate route:', e);
    return NextResponse.json({ error: 'Failed to evaluate route' }, { status: 500 });
  }
}



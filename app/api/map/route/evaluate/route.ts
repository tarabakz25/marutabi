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
      if (!origin || !destination) {
        return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
      }
      route = await findRoute({ originId: origin, destinationId: destination, viaIds: via, priority });
    }

    const evalInput = toEvaluationInput(route);
    const composite = computeCompositeScore(evalInput);

    let llm: any = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        llm = await evaluateRouteWithLLM({ ...evalInput, locale: 'ja', style: 'concise' });
      } catch (e) {
        llm = { error: 'LLM evaluation failed' };
      }
    }

    return NextResponse.json({ composite, llm }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    console.error('Failed to evaluate route:', e);
    return NextResponse.json({ error: 'Failed to evaluate route' }, { status: 500 });
  }
}



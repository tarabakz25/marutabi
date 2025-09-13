import { NextResponse } from 'next/server';
import { recommendPassesWithLLM } from '@/lib/llmPassRecommend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const operators: string[] = Array.isArray(body?.operators) ? body.operators.filter((x: any) => typeof x === 'string') : [];
    const distanceTotal = Number(body?.distanceTotal ?? 0);
    const timeTotal = Number(body?.timeTotal ?? 0);
    const transferCount = Number(body?.transferCount ?? 0);
    const candidateIds: string[] | undefined = Array.isArray(body?.candidateIds) ? body.candidateIds.filter((x: any) => typeof x === 'string') : undefined;

    const result = await recommendPassesWithLLM({ operators, distanceTotal, timeTotal, transferCount, candidateIds });
    return NextResponse.json(result, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    return NextResponse.json({ recommendations: [] }, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}



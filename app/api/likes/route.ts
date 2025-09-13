import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getLikeSummary, toggleLike } from '@/lib/blog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = String(req.nextUrl.searchParams.get('tripId') ?? '').trim();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    let userId: string | undefined = undefined;
    try { userId = (await requireUser()).userId; } catch {}
    const sum = await getLikeSummary(tripId, userId);
    return NextResponse.json(sum, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Failed to get likes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const tripId = String(body?.tripId ?? '').trim();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    const result = await toggleLike({ tripId, userId });
    return NextResponse.json(result, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to toggle like' }, { status: code });
  }
}



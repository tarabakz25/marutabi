import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createComment, listCommentsByTrip } from '@/lib/blog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = String(req.nextUrl.searchParams.get('tripId') ?? '').trim();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    const list = await listCommentsByTrip(tripId);
    return NextResponse.json({ comments: list }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Failed to list comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const tripId = String(body?.tripId ?? '').trim();
    const text = String(body?.body ?? '').trim();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'body is required' }, { status: 400 });
    const rec = await createComment({ tripId, userId, body: text });
    return NextResponse.json({ comment: rec }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to create comment' }, { status: code });
  }
}



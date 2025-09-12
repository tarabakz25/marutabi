import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createRating, listPublicRatings } from '@/lib/ratings';
import { createNotification } from '@/lib/notifications';
import { getTripById } from '@/lib/trips';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await listPublicRatings();
    return NextResponse.json(list, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Failed to list ratings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const tripId = String(body?.tripId ?? '').trim();
    const stars = Number(body?.stars ?? 0);
    const comment = body?.comment ? String(body.comment) : undefined;
    const isPublic = Boolean(body?.isPublic ?? false);
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return NextResponse.json({ error: 'stars 1..5' }, { status: 400 });
    // verify trip belongs to user (or team member) - minimal check: owner
    const trip = await getTripById(tripId, userId);
    if (!trip) return NextResponse.json({ error: 'trip not found' }, { status: 404 });
    const rating = await createRating({ tripId, userId, stars, comment, isPublic });
    await createNotification({ userId, title: '評価を投稿しました', body: `${stars}★` });
    return NextResponse.json({ rating }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to create rating' }, { status: code });
  }
}



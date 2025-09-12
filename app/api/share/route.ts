import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createShare, getShareByToken, addTeamMember } from '@/lib/shares';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (url) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return NextResponse.json({ url, qrUrl });
  }
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'url or token is required' }, { status: 400 });
  const share = await getShareByToken(token);
  if (!share) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ share });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const tripId = String(body?.tripId ?? '').trim();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    const share = await createShare(tripId, userId);
    await addTeamMember(share.id, userId, 'admin');
    return NextResponse.json({ share }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to create share' }, { status: code });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const token = String(body?.token ?? '').trim();
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
    const share = await getShareByToken(token);
    if (!share) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const member = await addTeamMember(share.id, userId, 'member');
    if (share.adminUserId !== userId) {
      await createNotification({ userId: share.adminUserId, title: 'チーム参加', body: `メンバーが参加しました` });
    }
    return NextResponse.json({ member, share }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to join team' }, { status: code });
  }
}



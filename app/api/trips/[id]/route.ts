import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getTripById } from '@/lib/trips';
import { listMemberUserIdsByTrip } from '@/lib/shares';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const trip = await getTripById(id, userId);
    if (!trip) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ trip }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to get trip' }, { status: code });
  }
}

// Optional: notify team members when trip is updated
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    // For MVP, we don't persist updates here; only dispatch notifications
    const memberIds = await listMemberUserIdsByTrip(id);
    const targets = memberIds.filter((m) => m !== userId);
    await Promise.all(targets.map(uid => createNotification({ userId: uid, title: 'ルートが更新されました', body: `Trip ${id}` })));
    return NextResponse.json({ ok: true, notified: targets.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to notify team' }, { status: code });
  }
}



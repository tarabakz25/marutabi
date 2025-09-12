import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listNotificationsByUser } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const notifications = await listNotificationsByUser(userId);
    return NextResponse.json(notifications, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to list notifications' }, { status: code });
  }
}



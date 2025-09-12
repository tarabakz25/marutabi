import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getTripById } from '@/lib/trips';

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



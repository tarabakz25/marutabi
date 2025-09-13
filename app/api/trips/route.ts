import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listTripsByUser, saveTrip } from '@/lib/trips';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const trips = await listTripsByUser(userId);
    return NextResponse.json({ trips }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = ((): string => {
      if (e instanceof Error) return e.message;
      try {
        if (e && typeof e === 'object' && 'message' in (e as any)) return String((e as any).message);
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    })();
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to list trips' }, { status: code });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const note = body?.note ? String(body.note).trim() : undefined;
    const selection = body?.selection;
    const route = body?.route;
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!selection || !route) return NextResponse.json({ error: 'selection and route are required' }, { status: 400 });
    const saved = await saveTrip({ userId, title, note, selection, route });
    return NextResponse.json({ id: saved.id, trip: saved }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    const msg = ((): string => {
      if (e instanceof Error) return e.message;
      try {
        if (e && typeof e === 'object' && 'message' in (e as any)) return String((e as any).message);
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    })();
    const code = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg || 'Failed to save trip' }, { status: code });
  }
}



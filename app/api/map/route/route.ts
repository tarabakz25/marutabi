import { NextRequest, NextResponse } from 'next/server';
import { findRoute } from '@/lib/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const via = searchParams.getAll('via');
    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }
    const geojson = await findRoute({ originId: origin, destinationId: destination, viaIds: via });
    return NextResponse.json(geojson, {
      headers: { 'content-type': 'application/geo+json; charset=utf-8' },
    });
  } catch (e) {
    console.error('Failed to calculate route:', e);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const origin = body?.origin as string | undefined;
    const destination = body?.destination as string | undefined;
    const viaParam = body?.via as string[] | string | undefined;
    const via = Array.isArray(viaParam) ? viaParam : viaParam ? [viaParam] : [];
    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }
    const geojson = await findRoute({ originId: origin, destinationId: destination, viaIds: via });
    return NextResponse.json(geojson, {
      headers: { 'content-type': 'application/geo+json; charset=utf-8' },
    });
  } catch (e) {
    console.error('Failed to calculate route:', e);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { listPasses } from '@/lib/passes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await listPasses();
    return NextResponse.json(list, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    return NextResponse.json([], { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}



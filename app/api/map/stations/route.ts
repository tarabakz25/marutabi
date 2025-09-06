import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'map', 'N02-24_Station.geojson');
    const content = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'content-type': 'application/geo+json; charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Failed to read station geojson:', error);
    return NextResponse.json({ error: 'Failed to load stations' }, { status: 500 });
  }
}



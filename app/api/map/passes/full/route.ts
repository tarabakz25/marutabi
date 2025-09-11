import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const passPath = path.join(process.cwd(), 'data', 'pass', 'free_passes.geojson');
    const json = JSON.parse(await fs.readFile(passPath, 'utf-8')) as any;
    const list = (json.features ?? []).map((f: any) => ({
      id: f?.properties?.id as string,
      name: (f?.properties?.name as string) ?? (f?.properties?.id as string),
      rules: f?.properties?.rules ?? undefined,
    })).filter((x: any) => x?.id);
    return NextResponse.json(list, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e) {
    return NextResponse.json([], { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}



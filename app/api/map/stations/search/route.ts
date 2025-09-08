import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

// Cache parsed station data between requests to improve performance
let cachedStations: { id: string; name: string; position: [number, number] }[] | null = null;

async function loadStations() {
  if (cachedStations) return cachedStations;

  const filePath = path.join(process.cwd(), 'data', 'map', 'N02-24_Station.geojson');
  const content = await fs.readFile(filePath, 'utf-8');
  const geo = JSON.parse(content);

  const stations: { id: string; name: string; position: [number, number] }[] = [];
  for (const f of geo.features ?? []) {
    const name = f?.properties?.N02_005 as string | undefined;
    if (!name) continue;
    const id = (f?.properties?.N02_005c || f?.properties?.N02_005g) as string | undefined;
    if (!id) continue;

    // Geometry may vary; find representative coordinate
    let position: [number, number] | undefined;
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Point') {
      position = g.coordinates as [number, number];
    } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
      const coords = g.coordinates as [number, number][];
      position = coords[Math.floor(coords.length / 2)];
    } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      let longest: [number, number][] | undefined;
      for (const part of g.coordinates as [number, number][][]) {
        if (!longest || part.length > longest.length) longest = part;
      }
      if (longest) position = longest[Math.floor(longest.length / 2)];
    }
    if (!position) continue;

    stations.push({ id, name, position });
  }
  cachedStations = stations;
  return stations;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'query parameter "q" required' }, { status: 400 });
  }

  const stations = await loadStations();
  const qLower = q.toLowerCase();
  const result = stations.filter((s) => s.name.toLowerCase().includes(qLower)).slice(0, 20);

  return NextResponse.json(result, {
    headers: {
      'cache-control': 'public, max-age=300'
    }
  });
}

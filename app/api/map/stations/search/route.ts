import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

let stationsCache: { id: string; name: string; position: [number, number] }[] | null = null;

async function loadStations() {
  if (stationsCache) return stationsCache;
  const filePath = path.join(process.cwd(), 'data', 'map', 'N02-24_Station.geojson');
  const content = await fs.readFile(filePath, 'utf-8');
  const geojson = JSON.parse(content);
  const stations: { id: string; name: string; position: [number, number] }[] = [];
  for (const f of geojson.features as any[]) {
    const props = f?.properties ?? {};
    const name: string | undefined = props.N02_005;
    const id: string | undefined = props.N02_005c ?? props.N02_005g;
    if (!name || !id) continue;
    // geometry is LineString or Point. Pick first coordinate as representative.
    let lng = 0;
    let lat = 0;
    if (f.geometry.type === 'Point') {
      [lng, lat] = f.geometry.coordinates;
    } else if (f.geometry.type === 'LineString') {
      [lng, lat] = f.geometry.coordinates[0];
    } else if (f.geometry.type === 'MultiLineString') {
      [lng, lat] = f.geometry.coordinates[0][0];
    }
    stations.push({ id, name, position: [lng, lat] });
  }
  stationsCache = stations;
  return stations;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    if (!q) {
      return NextResponse.json({ results: [] });
    }
    const stations = await loadStations();
    const lower = q.toLowerCase();
    const filtered = stations.filter((s) => s.name.toLowerCase().includes(lower));
    // sort by position of match and then by name length
    filtered.sort((a, b) => {
      const ia = a.name.toLowerCase().indexOf(lower);
      const ib = b.name.toLowerCase().indexOf(lower);
      if (ia !== ib) return ia - ib;
      return a.name.length - b.name.length;
    });
    return NextResponse.json({ results: filtered.slice(0, 20) });
  } catch (error) {
    console.error('Station search error', error);
    return NextResponse.json({ error: 'Failed to search stations' }, { status: 500 });
  }
}

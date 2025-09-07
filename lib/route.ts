import fs from 'node:fs/promises';
import path from 'node:path';
import type { FeatureCollection, LineString, Position, Feature } from 'geojson';

// Graph structures
interface Edge { to: string; weight: number; }
const adjacency = new Map<string, Edge[]>();
const nodeCoords = new Map<string, Position>();
const stationNode = new Map<string, string>();
let initialized = false;

function nodeId(pos: Position): string {
  return `${pos[0]},${pos[1]}`;
}

function haversine(a: Position, b: Position): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function initGraph() {
  if (initialized) return;
  initialized = true;
  const railPath = path.join(process.cwd(), 'data', 'map', 'N02-24_RailroadSection.geojson');
  const stationPath = path.join(process.cwd(), 'data', 'map', 'N02-24_Station.geojson');
  const railData = JSON.parse(await fs.readFile(railPath, 'utf-8')) as FeatureCollection<LineString>;
  for (const feature of railData.features) {
    const geom = feature.geometry;
    if (!geom || geom.type !== 'LineString') continue;
    const coords = geom.coordinates as Position[];
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const aId = nodeId(a);
      const bId = nodeId(b);
      nodeCoords.set(aId, a);
      nodeCoords.set(bId, b);
      const dist = haversine(a, b);
      if (!adjacency.has(aId)) adjacency.set(aId, []);
      if (!adjacency.has(bId)) adjacency.set(bId, []);
      adjacency.get(aId)!.push({ to: bId, weight: dist });
      adjacency.get(bId)!.push({ to: aId, weight: dist });
    }
  }

  const stationData = JSON.parse(await fs.readFile(stationPath, 'utf-8')) as FeatureCollection<LineString>;
  for (const f of stationData.features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const id = (props['N02_005c'] ?? props['N02_005g']) as string | undefined;
    if (!id) continue;
    const geom = f.geometry;
    if (!geom) continue;
    let coord: Position | undefined;
    if (geom.type === 'LineString') {
      const coords = geom.coordinates as Position[];
      coord = coords[Math.floor(coords.length / 2)] ?? coords[0];
    } else if (geom.type === 'MultiLineString') {
      const multi = geom.coordinates as Position[][];
      const longest = multi.reduce((a, b) => (a.length > b.length ? a : b), multi[0]);
      coord = longest[Math.floor(longest.length / 2)] ?? longest[0];
    }
    if (!coord) continue;
    const nearest = findNearestNode(coord);
    stationNode.set(id, nearest);
  }
}

function findNearestNode(target: Position): string {
  let result = '';
  let min = Infinity;
  for (const [id, pos] of nodeCoords) {
    const d = haversine(target, pos);
    if (d < min) {
      min = d;
      result = id;
    }
  }
  return result;
}

function dijkstra(start: string, goal: string): string[] {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const pq: [string, number][] = [];
  const push = (id: string, d: number) => {
    pq.push([id, d]);
  };
  const pop = () => {
    let idx = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i][1] < pq[idx][1]) idx = i;
    const [n, d] = pq[idx];
    pq.splice(idx, 1);
    return [n, d] as [string, number];
  };
  dist.set(start, 0);
  prev.set(start, null);
  push(start, 0);
  while (pq.length) {
    const [node, d] = pop();
    if (node === goal) break;
    const edges = adjacency.get(node) ?? [];
    for (const e of edges) {
      const nd = d + e.weight;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, node);
        push(e.to, nd);
      }
    }
  }
  const path: string[] = [];
  if (!prev.has(goal)) return path;
  let cur: string | null = goal;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return path;
}

export type FindRouteOptions = {
  originId: string;
  destinationId: string;
  viaIds?: string[];
};

export async function findRoute({ originId, destinationId, viaIds = [] }: FindRouteOptions): Promise<FeatureCollection<LineString>> {
  await initGraph();
  const points = [originId, ...viaIds, destinationId];
  const features: Feature<LineString>[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const startNode = stationNode.get(points[i]);
    const endNode = stationNode.get(points[i + 1]);
    if (!startNode || !endNode) {
      throw new Error('Unknown station id');
    }
    const path = dijkstra(startNode, endNode);
    const coords = path.map((id) => nodeCoords.get(id)!) as Position[];
    features.push({
      type: 'Feature',
      properties: { from: points[i], to: points[i + 1], seq: i },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  return { type: 'FeatureCollection', features };
}


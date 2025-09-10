import fs from 'node:fs/promises';
import path from 'node:path';
// import { MinHeap } from 'heap-js';  // Removed to use local implementation

// 簡易最小ヒープ — 開発時のホットリロードで再評価されても重複定義しないよう global キャッシュ
class LocalMinHeap<T> {
  private data: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  size() { return this.data.length; }
  push(item: T) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }
  pop(): T | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.cmp(this.data[i], this.data[p]) >= 0) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  private bubbleDown(i: number) {
    const n = this.data.length;
    while (true) {
      let l = i * 2 + 1;
      let r = l + 1;
      let smallest = i;
      if (l < n && this.cmp(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.cmp(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

import type { FeatureCollection, LineString, Position, Feature } from 'geojson';
// オフライン推定の優先基準
export type Priority = 'optimal' | 'cost' | 'time';

// Graph structures
interface Edge { to: string; dist: number; operator: string; line?: string; }
const adjacency = new Map<string, Edge[]>();
const nodeCoords = new Map<string, Position>();
const stationNode = new Map<string, string>();
const nodeStations = new Map<string, string[]>();
const stationInfo = new Map<string, { id: string; name: string | undefined; position: [number, number] }>();
// Spatial grid index for nearest-node lookup
const GRID_CELL_SIZE_DEG = 0.01; // ~1.1km @ mid-lat
const gridIndex = new Map<string, string[]>(); // key -> array of nodeIds

function cellIndex(v: number): number { return Math.floor(v / GRID_CELL_SIZE_DEG); }
function cellKey(ix: number, iy: number): string { return `${ix},${iy}`; }
function addToGridIndex(id: string, pos: Position) {
  const ix = cellIndex(pos[0]);
  const iy = cellIndex(pos[1]);
  const key = cellKey(ix, iy);
  if (!gridIndex.has(key)) gridIndex.set(key, []);
  gridIndex.get(key)!.push(id);
}
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

  // global cache (dev hot-reload friendly)
  const g = globalThis as any;
  if (g.__railGraph) {
    const cache = g.__railGraph;
    adjacency.clear();
    nodeCoords.clear();
    stationNode.clear();
    nodeStations.clear();
    stationInfo.clear();
    gridIndex.clear();
    // shallow copy
    for (const [k, v] of cache.adjacency) adjacency.set(k, v);
    for (const [k, v] of cache.nodeCoords) nodeCoords.set(k, v);
    for (const [k, v] of cache.stationNode) stationNode.set(k, v);
    for (const [k, v] of cache.nodeStations ?? []) nodeStations.set(k, v);
    for (const [k, v] of cache.stationInfo ?? []) stationInfo.set(k, v);
    for (const [k, v] of cache.gridIndex ?? []) gridIndex.set(k, v);
    initialized = true;
    return;
  }
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
      addToGridIndex(aId, a);
      addToGridIndex(bId, b);
      const dist = haversine(a, b);
      const props = feature.properties as any;
      const operator = props?.N02_004 as string | undefined ?? 'Unknown';
      const lineName = props?.N02_003 as string | undefined ?? 'UnknownLine';
      if (!adjacency.has(aId)) adjacency.set(aId, []);
      if (!adjacency.has(bId)) adjacency.set(bId, []);
      adjacency.get(aId)!.push({ to: bId, dist, operator, line: lineName });
      adjacency.get(bId)!.push({ to: aId, dist, operator, line: lineName });
    }
  }

  const stationData = JSON.parse(await fs.readFile(stationPath, 'utf-8')) as any;
  for (const f of stationData.features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const id = (props['N02_005c'] ?? props['N02_005g']) as string | undefined;
    if (!id) continue;
    const geom = f.geometry;
    if (!geom) continue;
    let coord: Position | undefined;
    if (geom.type === 'Point') {
      coord = geom.coordinates as Position;
    } else if (geom.type === 'LineString') {
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
    if (!nodeStations.has(nearest)) nodeStations.set(nearest, []);
    nodeStations.get(nearest)!.push(id);
    const name = (props['N02_005'] as string | undefined) ?? undefined;
    stationInfo.set(id, { id, name, position: coord as [number, number] });
  }

  // save to global cache
  g.__railGraph = { adjacency, nodeCoords, stationNode, nodeStations, stationInfo, gridIndex };
}

function findNearestNode(target: Position): string {
  // Search grid cells outward until we find candidates
  const ix0 = cellIndex(target[0]);
  const iy0 = cellIndex(target[1]);
  const MAX_RADIUS = 5; // expands up to ~50km worst-case
  let bestId = '';
  let bestD = Infinity;
  const visitCell = (ix: number, iy: number) => {
    const arr = gridIndex.get(cellKey(ix, iy));
    if (!arr) return;
    for (const id of arr) {
      const pos = nodeCoords.get(id)!;
      const d = haversine(target, pos);
      if (d < bestD) { bestD = d; bestId = id; }
    }
  };
  for (let r = 0; r <= MAX_RADIUS; r++) {
    if (r === 0) {
      visitCell(ix0, iy0);
    } else {
      // visit square ring at radius r
      for (let dx = -r; dx <= r; dx++) {
        visitCell(ix0 + dx, iy0 - r);
        visitCell(ix0 + dx, iy0 + r);
      }
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        visitCell(ix0 - r, iy0 + dy);
        visitCell(ix0 + r, iy0 + dy);
      }
    }
    if (bestId) break;
  }
  // Fallback: full scan (should be rare)
  if (!bestId) {
    for (const [id, pos] of nodeCoords) {
      const d = haversine(target, pos);
      if (d < bestD) { bestD = d; bestId = id; }
    }
  }
  return bestId;
}

type CostFn = (dist: number) => number;

// A* with transfer penalty (by operator/line change)
function aStar(
  start: string,
  goal: string,
  costFn: CostFn,
  allowOperator: (op: string) => boolean,
  options?: { transferPenalty?: number; lineChangePenalty?: number }
): string[] {
  const transferPenalty = options?.transferPenalty ?? 300; // meters equivalent
  const lineChangePenalty = options?.lineChangePenalty ?? 200; // meters equivalent

  type State = { id: string; g: number; f: number; prev: string | null; prevOp?: string; prevLine?: string };
  const open = new LocalMinHeap<State>((a, b) => a.f - b.f);
  const bestG = new Map<string, number>();
  const parent = new Map<string, string | null>();

  const goalPos = nodeCoords.get(goal)!;
  const h = (id: string) => haversine(nodeCoords.get(id)!, goalPos);

  open.push({ id: start, g: 0, f: h(start), prev: null });
  bestG.set(start, 0);
  parent.set(start, null);

  // Track previous edge attributes per node for penalty; store separately
  const prevEdgeAttr = new Map<string, { op?: string; line?: string }>();

  while (open.size()) {
    const cur = open.pop()!;
    if (cur.id === goal) {
      // reconstruct
      const path: string[] = [];
      let p: string | null = cur.id;
      parent.set(cur.id, cur.prev);
      while (p) {
        path.unshift(p);
        p = parent.get(p) ?? null;
      }
      return path;
    }
    if ((bestG.get(cur.id) ?? Infinity) < cur.g) continue;

    const edges = adjacency.get(cur.id) ?? [];
    for (const e of edges) {
      if (!allowOperator(e.operator)) continue;
      let stepCost = costFn(e.dist);
      // penalties
      const attr = prevEdgeAttr.get(cur.id);
      if (attr) {
        if (attr.op && attr.op !== e.operator) stepCost += transferPenalty;
        if (attr.line && attr.line !== (e.line ?? '')) stepCost += lineChangePenalty;
      }
      const tentativeG = cur.g + stepCost;
      if (tentativeG < (bestG.get(e.to) ?? Infinity)) {
        bestG.set(e.to, tentativeG);
        parent.set(e.to, cur.id);
        prevEdgeAttr.set(e.to, { op: e.operator, line: e.line });
        const fScore = tentativeG + h(e.to);
        open.push({ id: e.to, g: tentativeG, f: fScore, prev: cur.id, prevOp: e.operator, prevLine: e.line });
      }
    }
  }
  return [];
}

export type FindRouteOptions = {
  originId: string;
  destinationId: string;
  viaIds?: string[];
  priority?: Priority;
};

export type TransferPoint = { id: string; position: [number, number] };

export type RouteResult = {
  geojson: FeatureCollection<LineString>;
  summary: {
    fareTotal: number;
    timeTotal: number;
    distanceTotal: number;
    operators: string[];
    passes: string[];
  };
  transfers: TransferPoint[];
  routeStations: { id: string; name?: string; position: [number, number] }[];
};

export async function findRoute({
  originId,
  destinationId,
  viaIds = [],
  priority = 'optimal',
}: FindRouteOptions): Promise<RouteResult> {
  await initGraph();
  const overallOperators = new Set<string>();
  const points = [originId, ...viaIds, destinationId];
  const features: Feature<LineString>[] = [];
  let fareTotal = 0;
  let timeTotal = 0;
  let distanceTotal = 0;
  const transferSet = new Map<string, TransferPoint>();
  // 全区間にわたる経路上駅ID集合
  const routeStationIds = new Set<string>();

  for (let i = 0; i < points.length - 1; i++) {
    const startNode = stationNode.get(points[i]);
    const endNode = stationNode.get(points[i + 1]);
    if (!startNode || !endNode) {
      throw new Error('Unknown station id');
    }
    // コスト関数定義
    const costFn: CostFn = (d) => {
      if (priority === 'cost') return fareFromDistance(d);
      if (priority === 'time') return timeFromDistance(d);
      return d; // optimal = 距離優先
    };

    // オペレータ許可関数
    const allowOp = (op: string) => true; // 現状すべて許可（後でパス対応）

    const path = aStar(startNode, endNode, costFn, allowOp, { transferPenalty: 500, lineChangePenalty: 200 });
    // 経路の実距離を算出
    const coords = path.map((id) => nodeCoords.get(id)!) as Position[];
    // 区間内で利用する事業者を抽出
    const segOperators = new Set<string>();
    for (let j = 0; j < path.length - 1; j++) {
      const edges = adjacency.get(path[j]) ?? [];
      const edge = edges.find((e) => e.to === path[j + 1]);
      if (edge) segOperators.add(edge.operator);

      // detect transfer when operator or line changes between consecutive edges
      if (j < path.length - 2) {
        const edgesNext = adjacency.get(path[j + 1]) ?? [];
        const edgeNext = edgesNext.find((e) => e.to === path[j + 2]);
        const changed = edge && edgeNext && (edge.operator !== edgeNext.operator || (edge.line ?? '') !== (edgeNext.line ?? ''));
        if (changed) {
          const nodeIdMid = path[j + 1];
          const posMid = nodeCoords.get(nodeIdMid);
          if (posMid) {
            const stationIds = nodeStations.get(nodeIdMid) ?? [];
            const tid = stationIds[0] ?? nodeIdMid;
            if (!transferSet.has(tid)) {
              transferSet.set(tid, { id: tid, position: posMid as [number, number] });
            }
          }
        }
      }
    }
    const operatorsArr = Array.from(segOperators);
    const segDist = coords.reduce((acc, cur, idx) => {
      if (idx === 0) return 0;
      return acc + haversine(coords[idx - 1], cur);
    }, 0);
    distanceTotal += segDist;

    // 駅数カウント：path の各 nodeId が stationNode の値に含まれるか確認
    const stationNodeSet = new Set<string>();
    for (const [, nid] of stationNode) stationNodeSet.add(nid);
    let stationCountSeg = 0;
    for (const nid of path) if (stationNodeSet.has(nid)) stationCountSeg++;

    const fareSeg = fareFromDistance(segDist);
    const timeSeg = timeFromDistance(segDist);
    fareTotal += fareSeg;
    timeTotal += timeSeg;
    // Build contiguous segments by line name to enable per-line coloring
    let segStartIdx = 0;
    const currentLine = (idx: number) => {
      if (idx >= path.length - 1) return undefined;
      const edges = adjacency.get(path[idx]) ?? [];
      return edges.find((e) => e.to === path[idx + 1])?.line ?? 'UnknownLine';
    };
    for (let j = 0; j < path.length - 1; j++) {
      const lineNameHere = currentLine(j);
      const lineNameNext = currentLine(j + 1);
      const isBreak = lineNameHere !== lineNameNext;
      if (isBreak) {
        const coordsSlice = path.slice(segStartIdx, j + 2).map((nid) => nodeCoords.get(nid)!) as Position[];
        const partDist = coordsSlice.reduce((acc, cur, idx) => idx === 0 ? 0 : acc + haversine(coordsSlice[idx - 1], cur), 0);
        features.push({
          type: 'Feature',
          properties: {
            from: points[i],
            to: points[i + 1],
            seq: i,
            fare: fareFromDistance(partDist),
            time: timeFromDistance(partDist),
            distance: partDist,
            stationCount: stationCountSeg, // rough per segment
            operators: operatorsArr,
            lineName: lineNameHere,
          },
          geometry: { type: 'LineString', coordinates: coordsSlice },
        });
        segStartIdx = j + 1;
      }
    }
    // 全体 operators 集約
    for (const op of operatorsArr) overallOperators.add(op);

    // collect stations along this path and add to global set
    for (const nid of path) {
      const sids = nodeStations.get(nid) ?? [];
      for (const sid of sids) routeStationIds.add(sid);
    }
    // Always include endpoints for this leg
    routeStationIds.add(points[i]);
    routeStationIds.add(points[i + 1]);
  }
  // ---- パス候補 ----
  const passes = await suggestPasses(Array.from(overallOperators));
  // Build routeStations from transfers + endpoints + dedup across features path nodes
  const routeStationsSet = new Map<string, { id: string; name?: string; position: [number, number] }>();
  // endpoints from arguments
  for (const sid of points) {
    const info = stationInfo.get(sid);
    if (info) routeStationsSet.set(sid, { id: sid, name: info.name, position: info.position });
  }
  // transfers
  for (const t of transferSet.values()) {
    const candidateIds = nodeStations.get(t.id) ?? [];
    const sid = candidateIds[0] ?? t.id;
    const info = stationInfo.get(sid);
    const pos = info?.position ?? t.position;
    const name = info?.name;
    routeStationsSet.set(sid, { id: sid, name, position: pos });
  }
  // all pass-through stations (includes endpoints; Map ensures dedup)
  for (const sid of routeStationIds) {
    const info = stationInfo.get(sid);
    if (info) {
      routeStationsSet.set(sid, { id: sid, name: info.name, position: info.position });
    }
  }
  return {
    geojson: { type: 'FeatureCollection', features },
    summary: { fareTotal, timeTotal, distanceTotal, operators: Array.from(overallOperators), passes },
    transfers: Array.from(transferSet.values()),
    routeStations: Array.from(routeStationsSet.values()),
  };
}

// ---- 料金・所要時間の簡易推定 ----
const BASE_FARE = 150; // 円
const COST_PER_KM = 20; // 円 / km
function fareFromDistance(m: number): number {
  return BASE_FARE + (COST_PER_KM * m) / 1000;
}

const SPEED_KMPH = 60; // 仮平均速度
function timeFromDistance(m: number): number {
  return (m / 1000) / SPEED_KMPH * 60; // minutes
}

// 簡易パス候補選定: 全 operators をカバーするパスを返す
async function suggestPasses(operators: string[]): Promise<string[]> {
  try {
    const passPath = path.join(process.cwd(), 'data', 'pass', 'free_passes.geojson');
    const json = JSON.parse(await fs.readFile(passPath, 'utf-8')) as any;
    const result: string[] = [];
    for (const f of json.features ?? []) {
      const include = f.properties?.rules?.include as any[] | undefined;
      if (!include) continue;
      const incOps = include.map((i) => i.operator).filter(Boolean) as string[];
      const coversAll = operators.every((op) => incOps.includes(op));
      if (coversAll) result.push(f.properties?.name ?? f.properties?.id);
    }
    return result.slice(0, 10);
  } catch {
    return [];
  }
}


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
    // shallow copy
    for (const [k, v] of cache.adjacency) adjacency.set(k, v);
    for (const [k, v] of cache.nodeCoords) nodeCoords.set(k, v);
    for (const [k, v] of cache.stationNode) stationNode.set(k, v);
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
  }

  // save to global cache
  g.__railGraph = { adjacency, nodeCoords, stationNode };
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

type CostFn = (dist: number) => number;

function dijkstra(start: string, goal: string, costFn: CostFn, allowOperator: (op: string) => boolean): string[] {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const pq = new LocalMinHeap<[string, number]>((a, b) => a[1] - b[1]);
  const push = (id: string, d: number) => {
    pq.push([id, d]);
  };
  const pop = () => pq.pop() as [string, number];
  dist.set(start, 0);
  prev.set(start, null);
  push(start, 0);
  while (pq.size()) {
    const [node, d] = pop();
    if (node === goal) break;
    const edges = adjacency.get(node) ?? [];
    for (const e of edges) {
      if (!allowOperator(e.operator)) continue;
      const nd = d + costFn(e.dist);
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

    const path = dijkstra(startNode, endNode, costFn, allowOp);
    // 経路の実距離を算出
    const coords = path.map((id) => nodeCoords.get(id)!) as Position[];
    // 区間内で利用する事業者を抽出
    const segOperators = new Set<string>();
    for (let j = 0; j < path.length - 1; j++) {
      const edges = adjacency.get(path[j]) ?? [];
      const edge = edges.find((e) => e.to === path[j + 1]);
      if (edge) segOperators.add(edge.operator);

      // detect transfer when operator changes between consecutive edges
      if (j < path.length - 2) {
        const edgesNext = adjacency.get(path[j + 1]) ?? [];
        const edgeNext = edgesNext.find((e) => e.to === path[j + 2]);
        if (edge && edgeNext && edge.operator !== edgeNext.operator) {
          const nodeIdMid = path[j + 1];
          const posMid = nodeCoords.get(nodeIdMid);
          if (posMid) {
            // pick first station id if exists else use nodeId as id
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
    features.push({
      type: 'Feature',
      properties: {
        from: points[i],
        to: points[i + 1],
        seq: i,
        fare: fareSeg,
        time: timeSeg,
        distance: segDist,
        stationCount: stationCountSeg,
        operators: operatorsArr,
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
    // 全体 operators 集約
    for (const op of operatorsArr) overallOperators.add(op);
  }
  // ---- パス候補 ----
  const passes = await suggestPasses(Array.from(overallOperators));
  return {
    geojson: { type: 'FeatureCollection', features },
    summary: { fareTotal, timeTotal, distanceTotal, operators: Array.from(overallOperators), passes },
    transfers: Array.from(transferSet.values()),
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


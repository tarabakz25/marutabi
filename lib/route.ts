import fs from 'node:fs/promises';
import path from 'node:path';
import { buildAllowEdgePredicate, getPassNames as getPassNamesFromCatalog, suggestPassesForOperators } from '@/lib/passes';
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
      const l = i * 2 + 1;
      const r = l + 1;
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

    // Transferエッジの追加は後段の二次パスでまとめて行う
  }

  // 二次パス: 各駅の最近傍ノードから、他の「駅に紐づくノード」にのみ乗換エッジを張る（過剰接続抑制）
  {
    const NEAR_RADIUS_M = 220; // やや広げる（実駅間を確実に接続）
    for (const [sid, info] of stationInfo) {
      const a = stationNode.get(sid);
      if (!a) continue;
      const nearNodeIds = findNodesWithinRadius(info.position as Position, NEAR_RADIUS_M);
      for (const b of nearNodeIds) {
        if (b === a) continue;
        if (!nodeStations.has(b)) continue; // 相手も駅に紐づくノードのみ
        const pa = nodeCoords.get(a)!;
        const pb = nodeCoords.get(b)!;
        const dist = haversine(pa, pb);
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        const existsAB = (adjacency.get(a)!).some((e) => e.to === b && e.operator === 'Transfer');
        const existsBA = (adjacency.get(b)!).some((e) => e.to === a && e.operator === 'Transfer');
        if (!existsAB) adjacency.get(a)!.push({ to: b, dist: Math.max(1, dist), operator: 'Transfer', line: 'Transfer' });
        if (!existsBA) adjacency.get(b)!.push({ to: a, dist: Math.max(1, dist), operator: 'Transfer', line: 'Transfer' });
      }
    }
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

// 半径内のノードID一覧を返す（簡易グリッドで範囲を絞る）
function findNodesWithinRadius(center: Position, radiusMeters: number): string[] {
  const degApprox = radiusMeters / 111320; // 1度 ≒ 111.32km
  const ix0 = cellIndex(center[0]);
  const iy0 = cellIndex(center[1]);
  const range = Math.max(1, Math.ceil(degApprox / GRID_CELL_SIZE_DEG));
  const result: string[] = [];
  const seen = new Set<string>();
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const arr = gridIndex.get(cellKey(ix0 + dx, iy0 + dy));
      if (!arr) continue;
      for (const id of arr) {
        if (seen.has(id)) continue;
        const pos = nodeCoords.get(id)!;
        if (haversine(center, pos) <= radiusMeters) {
          result.push(id);
          seen.add(id);
        }
      }
    }
  }
  return result;
}

type CostFn = (dist: number) => number;

// A* with transfer penalty (by operator/line change)
function aStar(
  start: string,
  goal: string,
  costFn: CostFn,
  allowEdge: (e: Edge) => boolean,
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
      if (!allowEdge(e)) continue;
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
  passIds?: string[]; // 指定された切符でのみ到達可能な経路にフィルタ
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
  passIds = [],
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

    // オペレータ・路線の許可関数（切符ルール適用）
    const allowEdge = await buildAllowEdge(passIds);

    let path = aStar(startNode, endNode, costFn, allowEdge, { transferPenalty: 500, lineChangePenalty: 200 });
    // フォールバック: 切符指定がない場合のみ緩和（新幹線許可）
    if ((!path || path.length === 0) && passIds.length === 0) {
      const allowAll = (_e: Edge) => true;
      path = aStar(startNode, endNode, costFn, allowAll, { transferPenalty: 500, lineChangePenalty: 200 });
    }
    if (!path || path.length === 0) {
      throw new Error(`No path found between ${points[i]} and ${points[i + 1]}`);
    }
    // 経路の実距離を算出
    const coords = path.map((id) => nodeCoords.get(id)!) as Position[];
    // 区間内で利用する事業者を抽出
    const segOperators = new Set<string>();
    for (let j = 0; j < path.length - 1; j++) {
      const edges = adjacency.get(path[j]) ?? [];
      const edge = edges.find((e) => e.to === path[j + 1]);
      if (edge) segOperators.add(edge.operator);
    }
    const operatorsArr = Array.from(segOperators);
    const segDist = coords.reduce((acc, cur, idx) => {
      if (idx === 0) return 0;
      return acc + haversine(coords[idx - 1], cur);
    }, 0);
    distanceTotal += segDist;

    // 駅ノード集合（全体で一度構築）
    const stationNodeSet = new Set<string>();
    for (const [, nid] of stationNode) stationNodeSet.add(nid);

    const countStationsInRange = (startIdx: number, endIdxInclusive: number) => {
      let c = 0;
      for (let k = startIdx; k <= endIdxInclusive; k++) {
        const nidHere = path[k];
        if (stationNodeSet.has(nidHere)) c++;
      }
      return c;
    };

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
            stationCount: countStationsInRange(segStartIdx, j + 1),
            operators: operatorsArr,
            lineName: lineNameHere,
          },
          geometry: { type: 'LineString', coordinates: coordsSlice },
        });
        // transfer at boundary node j+1 (line change point)
        const boundaryNode = path[j + 1];
        const posMid = nodeCoords.get(boundaryNode);
        if (posMid) {
          let sid = (nodeStations.get(boundaryNode) ?? [])[0];
          if (!sid) {
            const near = findNodesWithinRadius(posMid, 180);
            for (const nid of near) {
              const sids = nodeStations.get(nid);
              if (sids && sids[0]) { sid = sids[0]; break; }
            }
          }
          if (sid && !transferSet.has(sid)) {
            transferSet.set(sid, { id: sid, position: (stationInfo.get(sid)?.position ?? posMid) as [number, number] });
          }
        }
        segStartIdx = j + 1;
      }
    }

    // --- 乗換検出（Transferエッジを除外して前後の実路線が変わったノードを抽出） ---
    const getEdgeAttr = (u: string, v: string) => {
      const e = (adjacency.get(u) ?? []).find((x) => x.to === v);
      return e ? { op: e.operator, line: e.line } : undefined;
    };
    const isRealRail = (op?: string) => op && op !== 'Transfer';
    const findPrevNonTransferIdx = (k: number) => {
      for (let t = k - 1; t >= 0; t--) {
        const attr = getEdgeAttr(path[t], path[t + 1]);
        if (attr && isRealRail(attr.op)) return t;
      }
      return -1;
    };
    const findNextNonTransferIdx = (k: number) => {
      for (let t = k; t < path.length - 1; t++) {
        const attr = getEdgeAttr(path[t], path[t + 1]);
        if (attr && isRealRail(attr.op)) return t;
      }
      return -1;
    };

    const orderedTransfersForThisLeg: TransferPoint[] = [];
    const seenTransferStations = new Set<string>();
    for (let pivot = 1; pivot < path.length - 1; pivot++) {
      const prevIdx = findPrevNonTransferIdx(pivot);
      const nextIdx = findNextNonTransferIdx(pivot);
      if (prevIdx < 0 || nextIdx < 0) continue;
      const a = getEdgeAttr(path[prevIdx], path[prevIdx + 1]);
      const b = getEdgeAttr(path[nextIdx], path[nextIdx + 1]);
      if (!a || !b) continue;
      const changed = (a.op !== b.op) || ((a.line ?? '') !== (b.line ?? ''));
      if (!changed) continue;
      const nodeIdMid = path[pivot];
      // 駅IDを特定（同一ノードが駅でなければ近傍から駅を探す）
      const candStationIds = nodeStations.get(nodeIdMid) ?? [];
      let stationId = candStationIds[0];
      if (!stationId) {
        const near = findNodesWithinRadius(nodeCoords.get(nodeIdMid)!, 180);
        for (const nid of near) {
          const sids = nodeStations.get(nid);
          if (sids && sids[0]) { stationId = sids[0]; break; }
        }
      }
      if (!stationId) continue; // 駅が見つからない乗換はスキップ（UIに"乗換駅"を出さない）
      if (seenTransferStations.has(stationId)) continue;
      seenTransferStations.add(stationId);
      const info = stationInfo.get(stationId);
      if (!info) continue;
      orderedTransfersForThisLeg.push({ id: stationId, position: info.position });
    }
    // 順序を保ってセットに投入
    for (const t of orderedTransfersForThisLeg) {
      if (!transferSet.has(t.id)) transferSet.set(t.id, t);
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
  const passes = passIds.length > 0
    ? await getPassNamesFromCatalog(passIds)
    : await suggestPassesForOperators(Array.from(overallOperators));
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
// removed in favor of suggestPassesForOperators from lib/passes

// ---- 切符ルール適用 ----
async function buildAllowEdge(passIds: string[]): Promise<(e: Edge) => boolean> {
  return buildAllowEdgePredicate<Edge>(passIds);
}


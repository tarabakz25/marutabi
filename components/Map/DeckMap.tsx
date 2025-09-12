"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, BitmapLayer, TextLayer, GeoJsonLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { WebMercatorViewport } from '@deck.gl/core';
import type { StationSelection, SelectedStations } from './types';

const FIXED_ZOOM = 13.5;
const INITIAL_VIEW_STATE = {
  longitude: 139.767306,
  latitude: 35.681236,
  zoom: FIXED_ZOOM,
  pitch: 0,
  bearing: 0,
};

// 路線名に対して安定した色を割り当てる
const ROUTE_PALETTE: [number, number, number][] = [
  [31, 119, 180],  // blue
  [255, 127, 14],  // orange
  [44, 160, 44],   // green
  [214, 39, 40],   // red
  [148, 103, 189], // purple
  [140, 86, 75],   // brown
  [227, 119, 194], // pink
  [127, 127, 127], // gray
  [188, 189, 34],  // olive
  [23, 190, 207],  // cyan
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // 32bit に丸める
  }
  return Math.abs(hash);
}

function colorForRouteName(name?: string): [number, number, number, number] {
  if (!name) return [40, 100, 200, 220];
  const idx = hashString(name) % ROUTE_PALETTE.length;
  const [r, g, b] = ROUTE_PALETTE[idx];
  return [r, g, b, 220];
}

// Grid-based spatial sampling helper (approx cellDeg in degrees)
const gridSample = (points: { position: [number, number] }[], cellDeg: number) => {
  const q = (v: number) => Math.round(v / cellDeg);
  const seen = new Set<string>();
  const out: typeof points = [];
  for (const p of points) {
    const key = `${q(p.position[0])}:${q(p.position[1])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
};

type Props = {
  onStationClick?: (station: StationSelection) => void;
  selected?: SelectedStations;
  routeGeojson?: any;
  routeOperators?: string[];
  routeStations?: { id: string; name?: string; position: [number, number] }[];
  flyTo?: [number, number] | null;
  onLoadComplete?: () => void;
};

export default function DeckMap({ onStationClick, selected, routeGeojson, routeOperators, routeStations, flyTo, onLoadComplete }: Props) {
  const [railGeojson, setRailGeojson] = useState<any | null>(null);
  const [stationGeojson, setStationGeojson] = useState<any | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [viewState, setViewState] = useState<typeof INITIAL_VIEW_STATE>(INITIAL_VIEW_STATE);
  const [/* deprecated */, /* setDeprecated */] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
  const fetchData = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('Starting to fetch GeoJSON data...');
      
      const [railRes, stationRes] = await Promise.all([
        fetch('/api/map/railroads', {
          method: 'GET',
          headers: {
            'Accept': 'application/geo+json,application/json'
            // キャッシュを有効化するためにCache-Controlヘッダーを削除
          }
        }),
        fetch('/api/map/stations', {
          method: 'GET',
          headers: {
            'Accept': 'application/geo+json,application/json'
            // キャッシュを有効化するためにCache-Controlヘッダーを削除
          }
        })
      ]);

      // eslint-disable-next-line no-console
      console.log('Fetch responses received:', { railStatus: railRes.status, stationStatus: stationRes.status });

      if (!railRes.ok) {
        // eslint-disable-next-line no-console
        console.error('Railroad fetch failed:', railRes.status, railRes.statusText);
      }
      if (!stationRes.ok) {
        // eslint-disable-next-line no-console
        console.error('Station fetch failed:', stationRes.status, stationRes.statusText);
      }

      const [railData, stationData] = await Promise.all([
        railRes.ok ? railRes.json() : null,
        stationRes.ok ? stationRes.json() : null
      ]);

      // eslint-disable-next-line no-console
      console.log('GeoJSON data parsed:', { 
        railFeatures: railData?.features?.length || 0, 
        stationFeatures: stationData?.features?.length || 0 
      });

      if (railData) setRailGeojson(railData);
      if (stationData) setStationGeojson(stationData);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch geojson:', e);
      // eslint-disable-next-line no-console
      console.error('Error details:', {
        name: e instanceof Error ? e.name : 'Unknown',
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      });
    }
  };
    fetchData();
  }, []);

  // call onLoadComplete when both geojson loaded first time
  useEffect(() => {
    if (!dataLoaded && railGeojson && stationGeojson) {
      setDataLoaded(true);
      onLoadComplete?.();
    }
  }, [railGeojson, stationGeojson, dataLoaded, onLoadComplete]);

  useEffect(() => {
    if (flyTo) {
      setViewState((prev) => ({ ...prev, longitude: flyTo[0], latitude: flyTo[1] }));
    }
  }, [flyTo]);

  // container size tracking for fitBounds
  useEffect(() => {
    const updateSize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width !== containerSize.width || rect.height !== containerSize.height) {
        setContainerSize({ width: Math.max(1, Math.floor(rect.width)), height: Math.max(1, Math.floor(rect.height)) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      ro.disconnect();
    };
  }, [containerSize.width, containerSize.height]);

  const railDataFiltered = useMemo(() => {
    if (!railGeojson) return { type: 'FeatureCollection', features: [] };
    if (!routeOperators || routeOperators.length === 0) return railGeojson;
    const feats = railGeojson.features.filter((f: any) => {
      const op = f?.properties?.N02_004 as string | undefined;
      return routeOperators.includes(op ?? '');
    });
    return { ...railGeojson, features: feats };
  }, [railGeojson, routeOperators]);

  type StationPoint = { position: [number, number]; name?: string; id?: string; lineName?: string };

  const stationPointsAll = useMemo<StationPoint[]>(() => {
    if (!stationGeojson?.features) return [] as StationPoint[];
    const points: StationPoint[] = [];
    for (const f of stationGeojson.features) {
      const g = f?.geometry;
      if (!g) continue;
      let position: [number, number] | undefined;
      if (g.type === 'Point' && Array.isArray(g.coordinates)) {
        const coords = g.coordinates as [number, number];
        position = coords as [number, number];
      } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
        const coords = g.coordinates as [number, number][];
        const idx = Math.floor(coords.length / 2);
        position = (coords[idx] ?? coords[0]) as [number, number];
      } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
        // 最長のLineStringの中点を採用
        let longest: [number, number][] | undefined;
        for (const part of g.coordinates as [number, number][][]) {
          if (!longest || part.length > longest.length) longest = part;
        }
        if (longest && longest.length > 0) {
          const idx = Math.floor(longest.length / 2);
          position = (longest[idx] ?? longest[0]) as [number, number];
        }
      }
      if (!position) continue;
      const name = f?.properties?.N02_005 as string | undefined;
      const lineName = f?.properties?.N02_003 as string | undefined;
      const id = (f?.properties?.N02_005c || f?.properties?.N02_005g) as string | undefined;
      points.push({ position, name, id, lineName });
    }
    return points;
  }, [stationGeojson]);

  // 近接する駅を1つに集約する（半径400m でクラスタリング）
  const stationPointsAggregatedAll = useMemo<StationPoint[]>(() => {
    if (stationPointsAll.length === 0) return [] as StationPoint[];

    // 簡易 haversine  (メートル)
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const haversine = (a: [number, number], b: [number, number]): number => {
      const dLat = toRad(b[1] - a[1]);
      const dLon = toRad(b[0] - a[0]);
      const lat1 = toRad(a[1]);
      const lat2 = toRad(b[1]);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };

    const THRESHOLD = 400; // meters

    const clusters: StationPoint[][] = [];
    for (const p of stationPointsAll) {
      if (!p.position) continue;
      let found = false;
      for (const cluster of clusters) {
        if (haversine(p.position, cluster[0].position) < THRESHOLD) {
          cluster.push(p);
          found = true;
          break;
        }
      }
      if (!found) clusters.push([p]);
    }

    const aggregated: StationPoint[] = clusters.map((cluster) => {
      // 重心計算
      let lonSum = 0;
      let latSum = 0;
      let baseName: string | undefined = undefined;
      let id: string | undefined = undefined;
      const lineSet = new Set<string>();
      for (const p of cluster) {
        lonSum += p.position[0];
        latSum += p.position[1];
        // 表示名は最初に現れた名前をベース名とする
        if (!baseName && p.name) baseName = p.name;
        if (!id && p.id) id = p.id;
        if (p.lineName) lineSet.add(p.lineName);
      }
      const count = cluster.length;
      // 代表座標: クラスタの先頭要素を使用（任意の一点）
      const representative = cluster[0]?.position ?? [lonSum / count, latSum / count];
      return {
        name: baseName,
        id,
        position: representative as [number, number],
      };
    });
    return aggregated;
  }, [stationPointsAll]);

  // 一意な駅名でフィルタ（同名は最初の1件のみ採用）
  const stationPointsUniqueByName = useMemo<StationPoint[]>(() => {
    if (stationPointsAggregatedAll.length === 0) return [] as StationPoint[];
    const map = new Map<string, StationPoint>();
    for (const p of stationPointsAggregatedAll) {
      const key = (p.name ?? '').trim();
      // 名前があるものは名前で一意に、無いものは座標で一意に
      const dedupeKey = key !== '' ? `name:${key}` : `pos:${p.position[0]},${p.position[1]}`;
      if (!map.has(dedupeKey)) map.set(dedupeKey, p);
    }
    return Array.from(map.values());
  }, [stationPointsAggregatedAll]);

  const stationNameFrequency = useMemo(() => {
    const freq = new Map<string, number>();
    if (!stationGeojson?.features) return freq;
    for (const f of stationGeojson.features) {
      const name = f?.properties?.N02_005 as string | undefined;
      if (!name) continue;
      freq.set(name, (freq.get(name) ?? 0) + 1);
    }
    return freq;
  }, [stationGeojson]);

  // 乗り入れ路線数が多い駅（＝利用者が多い傾向）を抽出
  const stationPointsFrequent = useMemo<StationPoint[]>(() => {
    if (stationPointsAggregatedAll.length === 0) return [] as StationPoint[];
    const frequent: StationPoint[] = [];
    for (const p of stationPointsAggregatedAll) {
      const name = p.name ?? '';
      const freq = stationNameFrequency.get(name) ?? 0;
      if (freq >= 3) frequent.push(p); // 3路線以上乗り入れ
    }
    // 頻度順に並べ、上位 800 件程度に制限してパフォーマンス確保
    frequent.sort((a, b) => {
      const fa = stationNameFrequency.get(a.name ?? '') ?? 0;
      const fb = stationNameFrequency.get(b.name ?? '') ?? 0;
      return fb - fa;
    });
    return frequent.slice(0, 800);
  }, [stationPointsAggregatedAll, stationNameFrequency]);

  // Grid-based spatial sampling: keeps at most one point per cell
  const stationPointsMajor = useMemo<StationPoint[]>(() => {
    if (stationPointsAggregatedAll.length === 0) return [] as StationPoint[];
    const majors: StationPoint[] = [];
    for (const p of stationPointsAggregatedAll) {
      const name = p.name ?? '';
      const freq = stationNameFrequency.get(name) ?? 0;
      // 重複駅名(乗換可能性高) or サンプリングで主要駅化（常に一定割合が表示されるように）
      const sampled = name ? (hashString(name) % 5 === 0) : false; // 約20%
      if (freq >= 2 || sampled) majors.push(p);
    }
    return majors;
  }, [stationPointsAggregatedAll, stationNameFrequency]);

  // 1km / 2km グリッドでのサンプリングを事前計算（パフォーマンス向上）
  const majorSampled1km = useMemo(() => gridSample(stationPointsMajor, 0.01), [stationPointsMajor]);
  const majorSampled1_5km = useMemo(() => gridSample(stationPointsMajor, 0.015), [stationPointsMajor]);
  const frequentSampled2km = useMemo(() => gridSample(stationPointsFrequent, 0.02), [stationPointsFrequent]);

  // TextLayer用の文字セット（日本語対応）
  // 駅名に含まれる全ての文字からユニークな配列を生成
  const characterSet = useMemo(() => {
    const stationNames: string[] = stationGeojson?.features
      ?.map((f: any) => f?.properties?.N02_005 as string | undefined)
      .filter((v: string | undefined): v is string => Boolean(v)) ?? [];
    const lineNames: string[] = stationGeojson?.features
      ?.map((f: any) => f?.properties?.N02_003 as string | undefined)
      .filter((v: string | undefined): v is string => Boolean(v)) ?? [];
    const set = new Set<string>();
    // 追加でよく使う記号類も含める
    const common = ' -・()（）[ ]［］/／・,、。.【】『』"' + '\'' +
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    Array.from(common).forEach((c) => set.add(c));
    for (const name of stationNames) {
      for (const ch of Array.from(name)) set.add(ch);
    }
    for (const line of lineNames) {
      for (const ch of Array.from(line)) set.add(ch);
    }
    const result = Array.from(set);
    // eslint-disable-next-line no-console
    console.log('TextLayer characterSet size:', result.length);
    return result;
  }, [stationGeojson]);

  // ズームレベルに応じた駅データのフィルタリング  
  const visibleStations = useMemo(() => {
    // 経路がある場合は、経路上の駅のみ表示（出発/到着/経由/乗換を含む）
    if (routeStations && routeStations.length > 0) {
      // 経路時は駅名で一意化（同名は先勝ち）。
      // 駅名が無い場合のみ座標丸めでキー化。
      const byName = new Map<string, { id?: string; name?: string; position: [number, number] }>();
      const byCoord = new Map<string, { id?: string; name?: string; position: [number, number] }>();
      for (const s of routeStations) {
        const keyName = (s.name ?? '').trim();
        if (keyName !== '') {
          if (!byName.has(keyName)) byName.set(keyName, { id: s.id, name: s.name, position: s.position });
          continue;
        }
        const rounded = `${Math.round(s.position[0] * 1e5) / 1e5},${Math.round(s.position[1] * 1e5) / 1e5}`;
        if (!byCoord.has(rounded)) byCoord.set(rounded, { id: s.id, name: s.name, position: s.position });
      }
      return [...byName.values(), ...byCoord.values()] as StationPoint[];
    }

    // 経路がない場合は駅名で重複排除した集合を使用
    const base: StationPoint[] = stationPointsUniqueByName;

    // 必ず表示するステーション (選択済)
    const mustShow: StationPoint[] = [];
    if (selected?.origin) mustShow.push(selected.origin);
    if (selected?.destination) mustShow.push(selected.destination);
    if (selected?.vias?.length) mustShow.push(...selected.vias);

    if (mustShow.length === 0) return base;

    // id または座標で重複排除
    const seen = new Set<string>();
    const out: StationPoint[] = [...base];
    for (const p of base) {
      const key = p.id ?? `${p.position[0]},${p.position[1]}`;
      seen.add(key);
    }
    for (const p of mustShow) {
      const key = p.id ?? `${p.position[0]},${p.position[1]}`;
      if (!seen.has(key)) {
        out.push(p);
        seen.add(key);
      }
    }
    return out;
  }, [stationPointsUniqueByName, selected, routeStations]);

  const hasRoute = Boolean(routeGeojson?.features?.length);

  // 経路表示時は自動フィット（ルート全体が収まるようにビューを調整）
  useEffect(() => {
    try {
      if (!hasRoute) return;
      const width = containerSize.width;
      const height = containerSize.height;
      if (width <= 0 || height <= 0) return;
      const features = (routeGeojson?.features ?? []) as any[];
      if (features.length === 0) return;
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const f of features) {
        const geom = f?.geometry;
        if (!geom) continue;
        const coords: [number, number][] = (geom.type === 'LineString' ? geom.coordinates : []).filter(Array.isArray);
        for (const [lng, lat] of coords) {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }
      }
      if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) return;
      const vp = new WebMercatorViewport({ width, height, longitude: viewState.longitude, latitude: viewState.latitude, zoom: viewState.zoom });
      const { longitude, latitude, zoom } = vp.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 48 });
      setViewState((prev) => ({ ...prev, longitude, latitude, zoom }));
    } catch {
      // ignore fit errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute, routeGeojson, containerSize.width, containerSize.height]);

  const layers = [
    new TileLayer({
      id: 'osm-tiles',
      data: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      onTileError: (err) => {
        // eslint-disable-next-line no-console
        console.error('Tile load error', err);
      },
      renderSubLayers: (props) => {
        const bbox: any = (props as any).tile?.bbox ?? {};
        const west = bbox.west ?? bbox.left;
        const south = bbox.south ?? bbox.bottom;
        const east = bbox.east ?? bbox.right;
        const north = bbox.north ?? bbox.top;
        return new BitmapLayer(props, {
          id: `${props.id}-bitmap`,
          data: null as unknown as any,
          image: props.data,
          bounds: [west, south, east, north]
        });
      }
    }),
    // 基本の鉄道路線（検索結果がある場合は非表示）
    new GeoJsonLayer({
      id: 'railway-geojson',
      data: railDataFiltered,
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      getLineColor: (f: any) => colorForRouteName(f?.properties?.N02_003 as string | undefined),
      getLineWidth: 2.5,
      pickable: true,
      parameters: { depthTest: false },
      visible: viewState.zoom >= 5 && !hasRoute,
    }),
    // 選択中のルート線
    new GeoJsonLayer({
      id: 'route-lines',
      data: routeGeojson ?? { type: 'FeatureCollection', features: [] },
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      getLineColor: (f: any) => colorForRouteName((f?.properties?.lineName as string | undefined) ?? (f?.properties?.operators?.[0] as string | undefined)),
      getLineWidth: 4,
      pickable: false,
      parameters: { depthTest: false },
      visible: hasRoute,
    }),
    // 駅の点表示（経路時は経路上駅のみ）
    new ScatterplotLayer({
      id: 'stations',
      data: visibleStations,
      getPosition: (d: any) => d.position,
      radiusUnits: 'pixels',
      getRadius: viewState.zoom >= 13 ? 6 : 4,
      radiusMinPixels: 3,
      getFillColor: [220, 80, 60, 230],
      pickable: true,
        onClick: (info: any) => {
          const obj = info?.object;
          if (!obj) return;
          const coordId = `${obj.position[0]},${obj.position[1]}`;
          const station: StationSelection = {
            id: obj.id && obj.id !== '' ? obj.id : coordId,
            name: obj.name ?? '',
            position: obj.position as [number, number],
          };
        onStationClick?.(station);
      },
      parameters: { depthTest: false },
      visible: visibleStations.length > 0,
    }),
    // 選択中の駅（出発/到着/経由）を強調
    new ScatterplotLayer({
      id: 'selected-origin',
      data: selected?.origin ? [selected.origin] : [],
      getPosition: (d: any) => d.position,
      radiusUnits: 'pixels',
      getRadius: 9,
      radiusMinPixels: 6,
      getFillColor: [40, 170, 80, 240],
      pickable: false,
      parameters: { depthTest: false },
      visible: Boolean(selected?.origin),
    }),
    new ScatterplotLayer({
      id: 'selected-destination',
      data: selected?.destination ? [selected.destination] : [],
      getPosition: (d: any) => d.position,
      radiusUnits: 'pixels',
      getRadius: 9,
      radiusMinPixels: 6,
      getFillColor: [220, 60, 60, 240],
      pickable: false,
      parameters: { depthTest: false },
      visible: Boolean(selected?.destination),
    }),
    new ScatterplotLayer({
      id: 'selected-vias',
      data: selected?.vias ?? [],
      getPosition: (d: any) => d.position,
      radiusUnits: 'pixels',
      getRadius: 8,
      radiusMinPixels: 5,
      getFillColor: [60, 120, 220, 230],
      pickable: false,
      parameters: { depthTest: false },
      visible: Boolean(selected?.vias && selected.vias.length > 0),
    }),
    // 駅名ラベル（経路時は経路上駅のみ）
    new TextLayer({
      id: 'station-labels',
      data: visibleStations,
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.name ?? '',
      characterSet: characterSet,
      fontFamily: 'system-ui, -apple-system, "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", "Yu Gothic", "游ゴシック", Meiryo, メイリオ, "MS PGothic", "MS Gothic", sans-serif',
      fontWeight: 400,
      sizeUnits: 'pixels',
      getSize: 14,
      getAngle: 0,
      getTextAnchor: 'start',
      getPixelOffset: [8, 0],
      getAlignmentBaseline: 'center',
      getColor: [40, 40, 40, 255],
      background: true,
      getBackgroundColor: [255, 255, 255, 220],
      backgroundPadding: [2, 1, 2, 1],
      collisionEnabled: visibleStations.length <= 1500,
      collisionPadding: [4, 4],
      parameters: { 
        depthTest: false,
      },
      pickable: false,
      visible: visibleStations.length > 0,
      // フォント読み込みエラーへの対策
      onError: (error: any) => {
        // eslint-disable-next-line no-console
        console.warn('TextLayer error (fallback to system font):', error);
      },
    })
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={({ viewState: vs }: any) => {
          setViewState((prev) => {
            // 経路が無いときはズーム固定、位置のみ更新
            if (!hasRoute) {
              return { ...prev, longitude: vs.longitude, latitude: vs.latitude };
            }
            // 経路があるときは全て反映（ズーム解禁）
            return { ...prev, longitude: vs.longitude, latitude: vs.latitude, zoom: vs.zoom, bearing: vs.bearing ?? prev.bearing, pitch: vs.pitch ?? prev.pitch };
          });
        }}
        controller={{ scrollZoom: hasRoute, dragPan: true, dragRotate: false, touchZoom: hasRoute, doubleClickZoom: hasRoute, keyboard: hasRoute }}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
      />
      {/* Debug zoom display */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          padding: '2px 6px',
          fontSize: 12,
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      >
        z {viewState.zoom.toFixed(2)}
      </div>
    </div>
  );
}

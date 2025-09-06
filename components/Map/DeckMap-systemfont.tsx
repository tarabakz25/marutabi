"use client";

import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, BitmapLayer, TextLayer, GeoJsonLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

const INITIAL_VIEW_STATE = {
  longitude: 139.767306,
  latitude: 35.681236,
  zoom: 10,
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

export default function DeckMapSystemFont() {
  const [railGeojson, setRailGeojson] = useState<any | null>(null);
  const [stationGeojson, setStationGeojson] = useState<any | null>(null);
  const [viewState, setViewState] = useState<typeof INITIAL_VIEW_STATE>(INITIAL_VIEW_STATE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('Starting to fetch GeoJSON data...');
        
        const [railRes, stationRes] = await Promise.all([
          fetch('/api/map/railroads', {
            method: 'GET',
            headers: {
              'Accept': 'application/geo+json,application/json',
              'Cache-Control': 'no-cache'
            }
          }),
          fetch('/api/map/stations', {
            method: 'GET',
            headers: {
              'Accept': 'application/geo+json,application/json',
              'Cache-Control': 'no-cache'
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

  type StationPoint = { position: [number, number]; name?: string };

  const stationPointsAll = useMemo<StationPoint[]>(() => {
    if (!stationGeojson?.features) return [] as StationPoint[];
    const points: StationPoint[] = [];
    for (const f of stationGeojson.features) {
      const g = f?.geometry;
      if (!g) continue;
      let position: [number, number] | undefined;
      if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
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
      points.push({ position, name });
    }
    return points;
  }, [stationGeojson]);

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

  const stationPointsMajor = useMemo<StationPoint[]>(() => {
    if (stationPointsAll.length === 0) return [] as StationPoint[];
    const majors: StationPoint[] = [];
    for (const p of stationPointsAll) {
      const name = p.name ?? '';
      const freq = stationNameFrequency.get(name) ?? 0;
      // 重複駅名(乗換可能性高) or サンプリングで主要駅化（常に一定割合が表示されるように）
      const sampled = name ? (hashString(name) % 5 === 0) : false; // 約20%
      if (freq >= 2 || sampled) majors.push(p);
    }
    return majors;
  }, [stationPointsAll, stationNameFrequency]);

  // ズームレベルに応じた駅データのフィルタリング  
  const visibleStations = useMemo(() => {
    if (viewState.zoom >= 13) return stationPointsAll;
    if (viewState.zoom >= 8) return stationPointsMajor;
    return [];
  }, [stationPointsAll, stationPointsMajor, viewState.zoom]);

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
    new GeoJsonLayer({
      id: 'railway-geojson',
      data: railGeojson ?? { type: 'FeatureCollection', features: [] },
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      getLineColor: (f: any) => colorForRouteName(f?.properties?.N02_003 as string | undefined),
      getLineWidth: 2.5,
      pickable: true,
      parameters: { depthTest: false },
      visible: viewState.zoom >= 5,
    }),
    // 駅の点表示
    new ScatterplotLayer({
      id: 'stations',
      data: visibleStations,
      getPosition: (d: any) => d.position,
      radiusUnits: 'pixels',
      getRadius: viewState.zoom >= 13 ? 6 : 4,
      radiusMinPixels: 3,
      getFillColor: [220, 80, 60, 230],
      pickable: true,
      parameters: { depthTest: false },
      visible: visibleStations.length > 0,
    }),
    // 駅名ラベル（システムフォントのみ使用）
    new TextLayer({
      id: 'station-labels',
      data: visibleStations,
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.name ?? '',
      // システムフォントのみを使用（characterSetを指定しない）
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "Yu Gothic UI", "游ゴシック UI", YuGothic, "游ゴシック", "MS PGothic", "MS Gothic", sans-serif',
      fontWeight: 400,
      sizeUnits: 'pixels',
      getSize: viewState.zoom >= 13 ? 16 : 12,
      getAngle: 0,
      getTextAnchor: 'start',
      getPixelOffset: [8, 0],
      getAlignmentBaseline: 'center',
      getColor: [40, 40, 40, 255],
      background: true,
      getBackgroundColor: [255, 255, 255, 200],
      backgroundPadding: [2, 1, 2, 1],
      parameters: { 
        depthTest: false,
        blend: true,
        blendFunc: ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
      },
      pickable: false,
      visible: visibleStations.length > 0,
    })
  ];

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      viewState={viewState}
      onViewStateChange={({ viewState }) => setViewState(viewState as typeof INITIAL_VIEW_STATE)}
      controller={true}
      layers={layers}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

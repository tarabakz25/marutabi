"use client";

import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { RailwayDataCache, StationLOD, getAllJRData } from '@/lib/railwayLOD';

const INITIAL_VIEW_STATE = {
  longitude: 139.767306,
  latitude: 35.681236,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};

export default function DeckMap() {
  const [stations, setStations] = useState<StationLOD[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await RailwayDataCache.getInstance().get('allData', getAllJRData);
      setStations(data.stations);
    };
    fetchData();
  }, []);

  const stationPoints = useMemo(() => {
    return stations
      .filter((s): s is StationLOD & { lat: number; lng: number } => s.lat !== undefined && s.lng !== undefined)
      .map((s) => ({
        position: [s.lng as number, s.lat as number] as [number, number],
        name: s.name,
        colorHex: s.lineColor as string | undefined,
      }));
  }, [stations]);

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
        const {
          bbox: {west, south, east, north}
        } = props.tile;
        return new BitmapLayer(props, {
          id: `${props.id}-bitmap`,
          data: null,
          image: props.data,
          bounds: [west, south, east, north]
        });
      }
    }),
    new ScatterplotLayer({
      id: 'stations',
      data: stationPoints,
      getPosition: (d: any) => d.position,
      // Google マップの既定ピンに近いブルー（#1A73E8）
      getFillColor: () => [26, 115, 232, 220],
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 1.25,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
    })
  ];

  return (
    <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers} style={{ width: '100%', height: '100%' }} />
  );
}



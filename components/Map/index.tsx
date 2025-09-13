"use client";

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { DeckMapHandle } from './DeckMap';
import type { SelectedStations, StationSelection } from './types';

// default エクスポートを明示して解決
const DeckMap = dynamic(() => import('./DeckMap'), { ssr: false });

export type DeckMapProps = {
  onStationClick?: (station: StationSelection) => void;
  selected?: SelectedStations;
  routeGeojson?: any;
  routeOperators?: string[];
  routeStations?: { id: string; name?: string; position: [number, number] }[];
  flyTo?: [number, number] | null;
  /** マップの初期ロード完了時に呼び出される */
  onLoadComplete?: () => void;
  /** ビューを初期位置・固定ズームにリセットするためのトリガー（タイムスタンプなど） */
  shouldResetView?: number;
};

export const Map = forwardRef<DeckMapHandle, DeckMapProps>((props, ref) => {
  // DeckMap は forwardRef 済みなので、そのまま透過する
  return <DeckMap ref={ref as any} {...props} />
});

export default Map;
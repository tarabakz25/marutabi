"use client";

import dynamic from 'next/dynamic';
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

export const Map = (props: DeckMapProps) => {
  return <DeckMap {...props} />
}

export default Map;
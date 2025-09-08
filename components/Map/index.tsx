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
};

export const Map = (props: DeckMapProps) => {
  return <DeckMap {...props} />
}

export default Map;
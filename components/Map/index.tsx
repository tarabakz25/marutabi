"use client";

import dynamic from 'next/dynamic';

// default エクスポートを明示して解決
const DeckMap = dynamic(() => import('./DeckMap').then((m) => m.default), { ssr: false });

export const Map = () => {
  return <DeckMap />
}

export default Map;
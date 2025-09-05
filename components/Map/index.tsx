"use client";

import dynamic from 'next/dynamic';

const DeckMap = dynamic(() => import('@/components/Map/DeckMap'), { ssr: false });

export const Map = () => {
  return <DeckMap />
}
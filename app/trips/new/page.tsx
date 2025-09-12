import type { Metadata } from 'next';
import { Suspense } from 'react';
import MapWithSidebar from '@/components/Map/MapWithSidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: '新規旅行作成',
};

export default async function NewTripPage() {

  return (
    <main className="w-full h-full">
      <Header />
      <Suspense fallback={<div className="w-full h-[calc(100dvh-5rem)] flex items-center justify-center">読み込み中...</div>}>
        <MapWithSidebar />
      </Suspense>
    </main>
  );
}

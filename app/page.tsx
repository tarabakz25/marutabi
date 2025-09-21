import type { Metadata } from 'next';
import { Suspense } from 'react';
import MapWithSidebar from '@/components/Map/MapWithSidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'まるたび',
};

export default async function Home() {
  return (
    <main className="w-full h-full">
      <Header />
      <Suspense fallback={<div className="w-full min-h-[calc(100svh-8rem)] flex items-center justify-center">読み込み中...</div>}>
        <MapWithSidebar />
      </Suspense>
      <Footer />
    </main>
  );
}

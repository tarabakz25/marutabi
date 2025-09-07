import type { Metadata } from 'next';
import MapWithSidebar from '@/components/Map/MapWithSidebar';

export const metadata: Metadata = {
  title: '新規旅行作成',
};

export default function NewTripPage() {
  return (
    <main className="w-full h-full">
      <MapWithSidebar />
    </main>
  );
}

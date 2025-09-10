import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import MapWithSidebar from '@/components/Map/MapWithSidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: '新規旅行作成',
};

export default async function NewTripPage() {

  return (
    <main className="w-full h-full">
      <Header />
      <MapWithSidebar />
    </main>
  );
}

import Header from '@/components/Header';
import MapWithSidebar from '@/components/Map/MapWithSidebar';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <MapWithSidebar />
    </main>
  );
}

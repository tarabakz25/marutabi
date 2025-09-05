import { Map } from '@/components/Map';
import { Header } from '@/components/Header';

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="h-screen">
        <Header />
        <Map />
      </div>
    </main>
  );
}

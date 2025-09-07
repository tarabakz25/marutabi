import { Map } from '@/components/Map';
import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Map />
      </div>
    </main>
  );
}

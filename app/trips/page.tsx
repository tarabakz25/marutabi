import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const metadata: Metadata = { title: '保存した旅' };

async function fetchTrips() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/trips`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return (json?.trips ?? []) as any[];
}

export default async function TripsListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="max-w-5xl">
          <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
          <div className="rounded-lg border p-6 bg-white">ログインしてください。</div>
        </div>
      </main>
    );
  }

  const trips = await fetchTrips();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
        {trips.length === 0 ? (
          <div className="rounded-lg border p-6 bg-white text-slate-600">保存された旅はまだありません</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {trips.map((t: any) => (
              <Link key={t.id} href={`/trips/${t.id}`} className="rounded-lg border p-4 bg-white hover:shadow-sm transition">
                <div className="text-base font-medium mb-1">{t.title}</div>
                <div className="text-xs text-slate-500">更新: {new Date(t.updatedAt).toLocaleString('ja-JP')}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}



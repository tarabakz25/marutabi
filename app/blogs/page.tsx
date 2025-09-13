import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { FileText } from 'lucide-react';

async function fetchPublicRatings() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/ratings`, { cache: 'no-store' });
    if (!res.ok) return [] as any[];
    return (await res.json()) as any[];
  } catch {
    return [] as any[];
  }
}

async function fetchTripTitle(tripId: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/trips/${encodeURIComponent(tripId)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return String(data?.trip?.title ?? '') || null;
  } catch {
    return null;
  }
}

export default async function BlogPage() {
  const ratings = await fetchPublicRatings();
  const titles: Record<string, string | null> = Object.create(null);
  // なるべく同時取得
  await Promise.all(
    ratings.map(async (r: any) => {
      const t = await fetchTripTitle(r.tripId);
      titles[r.tripId] = t;
    })
  );
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="p-12">
          <div className="max-w-4xl space-y-6 mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">みんなの旅を見てみる</h1>
            </div>
            <div className="grid gap-4">
              {ratings.map((r) => (
                <Link key={r.id} href={`/trips/${encodeURIComponent(r.tripId)}`} className="rounded-lg border p-4 bg-white block hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 line-clamp-1">{titles[r.tripId] ?? '旅のタイトル（取得中）'}</div>
                      {r.comment && <div className="text-sm mt-1 text-slate-700 line-clamp-2">{r.comment}</div>}
                    </div>
                    <div className="text-yellow-600 text-sm whitespace-nowrap">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{new Date(r.createdAt).toLocaleString('ja-JP')}</div>
                </Link>
              ))}
              {ratings.length === 0 && (
                <div className="rounded-lg border p-6 text-sm text-slate-600 bg-white">まだ公開された評価はありません。</div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

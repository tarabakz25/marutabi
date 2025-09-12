import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { User, Map, FileText, Settings } from 'lucide-react';

const sidebarItems = [
  { label: 'Profile', href: '/dashboard', icon: User },
  { label: 'Trips', href: '/trips', icon: Map },
  { label: 'Blogs', href: '/blogs', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

async function fetchPublicRatings() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/ratings`, { cache: 'no-store' });
    if (!res.ok) return [] as any[];
    return (await res.json()) as any[];
  } catch {
    return [] as any[];
  }
}

export default async function BlogPage() {
  const ratings = await fetchPublicRatings();
  return (
    <SidebarProvider>
      <DashboardSidebar items={sidebarItems} />
      <SidebarInset>
        <div className="p-12">
          <div className="max-w-4xl space-y-6 mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">みんなの旅の評価</h1>
              <Link href="/" className="text-sm text-slate-600 underline">ホームへ</Link>
            </div>
            <div className="grid gap-4">
              {ratings.map((r) => (
                <div key={r.id} className="rounded-lg border p-4 bg-white">
                  <div className="text-yellow-600 text-sm">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                  {r.comment && <div className="text-sm mt-1">{r.comment}</div>}
                  <div className="text-xs text-slate-500 mt-2">{new Date(r.createdAt).toLocaleString('ja-JP')}</div>
                </div>
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

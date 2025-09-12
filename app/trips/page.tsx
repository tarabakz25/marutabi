import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listTripsByUser } from '@/lib/trips';
import { listLatestRatingsForTripsByUser } from '@/lib/ratings';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { User, Map, FileText, Settings, Plus } from "lucide-react";

export const metadata: Metadata = { title: '保存した旅' };
export const dynamic = 'force-dynamic';

export default async function TripsListPage() {
  const sidebarItems = [
    {
      label: "Profile",
      href: "/dashboard",
      icon: User,
    },
    {
      label: "Trips",
      href: "/trips",
      icon: Map,
    },
    {
      label: "Blogs",
      href: "/blogs",
      icon: FileText,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  try {
    const { userId } = await requireUser();
    const trips = await listTripsByUser(userId);
    const ratingMap = await listLatestRatingsForTripsByUser(trips.map(t => t.id), userId);
    return (
      <SidebarProvider>
        <DashboardSidebar 
          items={sidebarItems}
        />
        <SidebarInset>
          <main className="min-h-screen">
            <div className="p-12">
            <div className="max-w-5xl">
              <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
              {trips.length === 0 ? (
                <div className="rounded-lg border p-6 bg-white text-slate-600">保存された旅はまだありません</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {trips.map((t: any) => (
                    <Link key={t.id} href={`/trips/new?tripId=${t.id}`} className="rounded-lg border p-4 bg-white hover:shadow-sm transition">
                      <div className="text-base font-medium mb-1">{t.title}</div>
                      <div className="text-xs text-slate-500">更新: {new Date(t.updatedAt).toLocaleString('ja-JP')}</div>
                      {/* rating */}
                      {ratingMap[t.id] && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-yellow-600 text-sm">
                            {"★".repeat(ratingMap[t.id].stars)}{"☆".repeat(5 - ratingMap[t.id].stars)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ratingMap[t.id].isPublic ? '公開' : '非公開'}
                          </div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            </div>
          </main>
          <Button asChild size="lg" className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg">
            <Link href="/trips/new" aria-label="新しくルートを作る" className="flex items-center gap-2">
              <Plus className="size-5" />
              <span className="hidden sm:inline">新しくルートを作る</span>
            </Link>
          </Button>
        </SidebarInset>
      </SidebarProvider>
    );
  } catch {
    return (
      <SidebarProvider>
        <DashboardSidebar 
          items={sidebarItems}
        />
        <SidebarInset>
          <main className="min-h-screen">
            <div className="p-12">
            <div className="max-w-5xl">
              <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
              <div className="rounded-lg border p-6 bg-white">ログインしてください。</div>
            </div>
            </div>
          </main>
          <Button asChild size="lg" className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg w-16 h-16 sm:w-auto sm:h-auto sm:px-6 sm:py-4 bg-teal-900 hover:bg-teal-700 text-white">
            <Link href="/trips/new" aria-label="新しくルートを作る" className="flex items-center gap-2">
              <Plus className="size-6 sm:size-5" />
              <span className="hidden sm:inline text-base">新しくルートを作る</span>
            </Link>
          </Button>
        </SidebarInset>
      </SidebarProvider>
    );
  }
}

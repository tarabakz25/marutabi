import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { listTripsByUser } from '@/lib/trips';
import { listLatestRatingsForTripsByUser } from '@/lib/ratings';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus } from "lucide-react";
import TripCard from '@/components/TripCard';
export const metadata: Metadata = { title: '保存した旅' };
export const dynamic = 'force-dynamic';

export default async function TripsListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session?.user as any)?.id as string;

  try {
    const trips = await listTripsByUser(userId);
    const ratingMap = await listLatestRatingsForTripsByUser(trips.map(t => t.id), userId);
    return (
      <SidebarProvider>
        <DashboardSidebar />
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
                    <TripCard key={t.id} trip={{ id: t.id, title: t.title, updatedAt: t.updatedAt }} rating={ratingMap[t.id] ? { stars: ratingMap[t.id].stars, isPublic: ratingMap[t.id].isPublic } : undefined} />
                  ))}
                </div>
              )}
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
  } catch {
    return (
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <main className="min-h-screen">
            <div className="p-12">
            <div className="max-w-5xl">
              <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
              <div className="rounded-lg border p-6 bg-white">読み込みに失敗しました。時間をおいて再度お試しください。</div>
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

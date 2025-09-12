import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listTripsByUser } from '@/lib/trips';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { User, Map, FileText, Settings } from "lucide-react";

export const metadata: Metadata = { title: '保存した旅' };

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
    return (
      <SidebarProvider>
        <DashboardSidebar 
          items={sidebarItems}
        />
        <SidebarInset>
          <main className="min-h-screen px-6 py-10">
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
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </main>
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
          <main className="min-h-screen px-6 py-10">
            <div className="max-w-5xl">
              <h1 className="text-2xl font-semibold mb-4">保存した旅</h1>
              <div className="rounded-lg border p-6 bg-white">ログインしてください。</div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }
}

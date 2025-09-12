import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import DashboardSidebar from "@/components/DashboardSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { User, Map, FileText, Settings } from "lucide-react";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sidebarItems = [
    { label: "プロフィール", href: "/dashboard/profile", icon: User },
    { label: "旅", href: "/trips/new", icon: Map },
    { label: "ブログ", href: "/dashboard/blogs", icon: FileText },
    { label: "設定", href: "/settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <DashboardSidebar items={sidebarItems} />
      <SidebarInset>
        <div className="p-12">
          <h1 className="text-3xl font-bold mb-6">設定</h1>
          <SettingsContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


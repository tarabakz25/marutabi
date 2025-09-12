import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import DashboardSidebar from "@/components/DashboardSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="p-12">
          <h1 className="text-3xl font-bold mb-8">設定</h1>
          <SettingsContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


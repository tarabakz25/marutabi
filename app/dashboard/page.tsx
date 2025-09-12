import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import DashboardSidebar from "@/components/DashboardSidebar";
import LevelCard from "@/components/Dashboard/LevelCard";
import AchievementsCard from "@/components/Dashboard/AchievementsCard";
import RecentProgressCard from "@/components/Dashboard/RecentProgressCard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { User, Map, FileText, Settings } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userName = (session?.user as any)?.name as string | undefined;


  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="p-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold mb-6"><span className="font-medium">{userName}</span> ようこそ！</h1>
            <LevelCard />
            <RecentProgressCard />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/authOptions";
import Header from "@/components/Header";
import MapWithSidebar from "@/components/Map/MapWithSidebar";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1">
        <MapWithSidebar />
      </div>
    </div>
  );
}



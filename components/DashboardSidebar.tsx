import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { User, Map, FileText, Settings } from "lucide-react";
import { Nanum_Gothic_Coding } from "next/font/google";

const nanumGothicCoding = Nanum_Gothic_Coding({
  variable: "--font-nanum-gothic-coding",
  subsets: ["latin"],
  weight: ["400", "700"],
});

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
]

export default function DashboardSidebar() {
  return (
    <Sidebar className="bg-teal-100">
      <SidebarContent className="flex flex-col items-center">
        <SidebarHeader className="p-16">
          <h1 className={`text-3xl font-bold ${nanumGothicCoding.className}`}>まるたび</h1>
        </SidebarHeader>
        <SidebarGroupContent className="w-full p-4 list-none">
          {sidebarItems.map((item) => (
            <SidebarMenuItem key={item.href} className="w-full">
              <Link href={item.href} className="flex items-center gap-4 w-full my-16 rounded-lg p-5 hover:bg-teal-900 text-gray-500 hover:text-white transition-colors">
                <item.icon className="size-8" />
                <span className="text-lg font-medium">{item.label}</span>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarGroupContent>
      </SidebarContent>
    </Sidebar>
  );
}



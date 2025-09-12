import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { User, Settings, FileText, Map } from "lucide-react";
import Link from "next/link";

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

export default function DashboardSidebar({ items }: { items: { label: string; href: string; icon: React.ElementType }[] }) {
  return (
    <Sidebar>
      <SidebarContent className="flex flex-col items-center">
        <SidebarHeader className="p-16">
          <h1 className="text-2xl font-bold">まるたび</h1>
        </SidebarHeader>
        <SidebarGroupContent className="w-full p-4 list-none">
          {items.map((item) => (
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



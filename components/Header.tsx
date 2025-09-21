import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
// 簡素化: 検索/通知等のアクションは撤去
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Nanum_Gothic_Coding } from "next/font/google";

const nanumGothicCoding = Nanum_Gothic_Coding({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default async function Header() {
  const session = await getServerSession(authOptions);
  const userImage = (session?.user as any)?.image as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="w-full h-14 sm:h-16 md:h-20 sticky top-0 z-50 bg-white border-b flex items-center justify-between px-4 sm:px-6">
      <div className="flex-1">
        <Link href='/' className={`text-2xl font-bold ${nanumGothicCoding.className}`}>まるたび</Link>
      </div>
      <div className="flex items-center gap-3">
        {!session?.user && (
          <Link href="/login" className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:bg-slate-50">Login</Link>
        )}
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="size-10">
                {userImage ? (
                  <AvatarImage src={userImage} alt={userName ?? "user"} />
                ) : (
                  <AvatarFallback>{fallbackInitial}</AvatarFallback>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signout">Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
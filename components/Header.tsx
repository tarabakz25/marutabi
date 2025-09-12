import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import HeaderActions from "@/components/HeaderActions";
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

export default async function Header() {
  const session = await getServerSession(authOptions);
  const userImage = (session?.user as any)?.image as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="w-full h-20 sticky top-0 z-50 bg-white border-b flex items-center justify-between px-6">
      <div className="flex-1">
        <Link href='/' className="text-2xl font-bold">まるたび</Link>
      </div>
      <div className="flex items-center gap-3">
        <HeaderActions />
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
            <DropdownMenuContent
              side="bottom"
              align="start"
              alignOffset={-100}
            >
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Change theme</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function Header() {
  const session = await getServerSession(authOptions);
  const userImage = (session?.user as any)?.image as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="w-full h-24  sticky top-0 z-50">
      <div className="h-full px-8 flex items-center justify-end">
        <Avatar className="size-10">
          {userImage ? (
            <AvatarImage src={userImage} alt={userName ?? "user"} />
          ) : (
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          )}
        </Avatar>
      </div>
    </div>
  )
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
// 簡素化: 検索/通知等のアクションは撤去
import { Nanum_Gothic_Coding } from "next/font/google";
import UserMenuClient from "@/components/UserMenuClient";

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
          <UserMenuClient userName={userName} userImage={userImage} />
        )}
      </div>
    </div>
  )
}
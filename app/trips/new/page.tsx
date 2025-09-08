import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/authOptions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MapWithSidebar from '@/components/Map/MapWithSidebar';

export const metadata: Metadata = {
  title: '新規旅行作成',
};

export default async function NewTripPage() {
  const session = await getServerSession(authOptions);
  const userImage = (session?.user as any)?.image as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  return (
    <main className="w-full h-full">
      <MapWithSidebar />
      <div className="absolute top-4 right-4">

        {!session?.user && (
          <Link href="/login" className="inline-flex items-center px-3 py-1.5 rounded-md border hover:bg-slate-50">ログイン</Link>
        )}
        {session?.user && (
          <Avatar className="size-12">
            {userImage ? (
              <AvatarImage src={userImage} alt={userName ?? "user"} />
            ) : (
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            )}
          </Avatar>
        )}
      </div>
    </main>
  );
}

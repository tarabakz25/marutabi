import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/authOptions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">ダッシュボード</h1>
          <Link href="/trips/new" className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:opacity-90">新規作成</Link>
        </header>

        <section className="rounded-lg border p-8 bg-white text-center">
          <p className="text-slate-600 mb-4">まだ旅がありません。</p>
          <Link href="/trips/new" className="inline-flex items-center px-4 py-2 rounded-md border hover:bg-slate-50">最初の旅を作成</Link>
        </section>
      </div>
    </main>
  );
}



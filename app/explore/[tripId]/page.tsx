import Link from 'next/link';
import { notFound } from 'next/navigation';

const dummy = {
  t1: { id: 't1', title: '伊豆・海沿い 2日', summary: '東京→伊東→下田→修善寺', likes: 12 },
  t2: { id: 't2', title: '青春18きっぷ 東北縦断 5日', summary: '仙台→盛岡→青森→秋田→山形', likes: 34 },
  t3: { id: 't3', title: '四国一周 3日', summary: '高松→徳島→高知→松山', likes: 9 },
} as const;

type Params = { params: { tripId: keyof typeof dummy } };

export default function ExploreDetailPage({ params }: Params) {
  const data = dummy[params.tripId];
  if (!data) return notFound();
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl">
        <Link href="/explore" className="text-sm text-slate-600 hover:underline">← 一覧に戻る</Link>
        <h1 className="text-2xl font-semibold mt-2 mb-3">{data.title}</h1>
        <div className="text-slate-600 mb-6">{data.summary}</div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-md border hover:bg-slate-50">いいね</button>
          <button className="px-4 py-2 rounded-md bg-black text-white hover:opacity-90">この旅をフォーク</button>
        </div>
      </div>
    </main>
  );
}



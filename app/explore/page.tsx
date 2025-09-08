import Link from 'next/link';

const dummyTrips = [
  { id: 't1', title: '伊豆・海沿い 2日', likes: 12, tags: ['#海沿い', '#温泉'], days: 2 },
  { id: 't2', title: '青春18きっぷ 東北縦断 5日', likes: 34, tags: ['#18きっぷ'], days: 5 },
  { id: 't3', title: '四国一周 3日', likes: 9, tags: ['#島', '#ローカル線'], days: 3 },
];

export default function ExplorePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">公開された旅</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dummyTrips.map((t) => (
          <Link key={t.id} href={`/explore/${t.id}`} className="rounded-lg border p-5 bg-white hover:shadow-sm transition">
            <div className="text-base font-medium mb-1">{t.title}</div>
            <div className="text-xs text-slate-600 mb-2">{t.days}日・いいね {t.likes}</div>
            <div className="flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 rounded px-2 py-0.5">{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}



import Link from 'next/link';

export default function MarketingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-6 bg-gradient-to-b from-white to-slate-50">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">フリーきっぷ旅を、もっとかんたんに。</h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl">
          旅のルートや計画を地図で作成・共有・比較。青春18きっぷや各種フリーきっぷに強い、旅行特化のプランナー。
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="inline-flex items-center px-5 py-3 rounded-md bg-black text-white hover:opacity-90">GitHubで始める</Link>
          <Link href="/explore" className="inline-flex items-center px-5 py-3 rounded-md bg-white border hover:bg-slate-50">公開旅をみる</Link>
        </div>
      </section>

      <section className="px-6 py-16 grid md:grid-cols-3 gap-6 max-w-5xl w-full mx-auto">
        <div className="rounded-lg border p-6 bg-white">
          <h3 className="font-semibold mb-2">18きっぷ特化</h3>
          <p className="text-sm text-slate-600">在来線のみのルート生成・比較に対応。きっぷの適用期間もチェック。</p>
        </div>
        <div className="rounded-lg border p-6 bg-white">
          <h3 className="font-semibold mb-2">共有が簡単</h3>
          <p className="text-sm text-slate-600">リンクひとつで友達と共有。公開/限定/非公開を切り替え可能。</p>
        </div>
        <div className="rounded-lg border p-6 bg-white">
          <h3 className="font-semibold mb-2">AIルート</h3>
          <p className="text-sm text-slate-600">海沿い/温泉/節約などのテーマで候補を自動生成（MVPはダミー）。</p>
        </div>
      </section>
    </main>
  );
}

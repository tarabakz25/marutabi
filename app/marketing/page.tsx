import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MarketingPage() {
  return (
    <main className="h-screen flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-6 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/blob-scene-haikei.svg)'
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white animate-fade-in-up">フリーきっぷ旅を、もっとかんたんに。</h1>
          <p className="text-base md:text-lg text-slate-200 max-w-2xl mt-6 animate-fade-in-up animation-delay-200">
            旅のルートや計画を地図で作成・共有・比較。青春18きっぷや各種フリーきっぷに強い、旅行特化のプランナー。
          </p>
          <div className="flex items-center gap-3 mt-6 animate-fade-in-up animation-delay-400">
            <Link href="/login" className="inline-flex items-center px-5 py-3 rounded-md bg-white text-black hover:bg-slate-100">GitHubで始める</Link>
            <Link href="/explore" className="inline-flex items-center px-5 py-3 rounded-md bg-transparent border border-white text-white hover:bg-white hover:text-black transition-colors">公開旅をみる</Link>
          </div>
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
      <Footer />
    </main>
  );
}

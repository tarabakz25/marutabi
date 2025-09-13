import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareJoinClient from './share/ShareJoinClient';

type Params = { params: Promise<{ token: string }> };

export default async function PublicSharePage({ params }: Params) {
  const { token } = await params;
  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">共有された旅</h1>
            <p className="text-slate-600">チームに参加して一緒に旅を楽しみましょう</p>
          </div>
          <ShareJoinClient token={token} />
        </div>
      </div>
      <Footer />
    </main>
  );
}



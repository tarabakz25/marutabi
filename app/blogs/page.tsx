import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import BlogCard from '@/components/Blog/BlogCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

function mockBlogs() {
  const now = Date.now();
  const base = [
    {
      title: '週末1泊2日で巡るローカル線モデルコース',
      excerpt: '乗り換え回数を抑えつつ、名物駅弁と温泉を両立する行程をご紹介。朝の快速の使い方がカギ。',
      author: '編集部',
      readingMinutes: 6,
      tags: ['ローカル線', '行程', 'ガイド'],
      coverImageSrc: '/space-4888643_1280.jpg',
    },
    {
      title: '乗り継ぎ最適化の考え方: 5分接続は本当に得か',
      excerpt: '遅延リスクと歩行距離、ホーム位置を定量化。余裕時間の「最適点」を事例で解説します。',
      author: '旅人A',
      readingMinutes: 7,
      tags: ['乗り換え', 'ルート設計', 'Tips'],
    },
    {
      title: '青春18きっぷで行く海鮮朝市: はや起きのご褒美',
      excerpt: '始発と快速を組み合わせて朝8時到着。帰路は景色優先の鈍行で。費用と所要のバランスも掲載。',
      author: '編集部',
      readingMinutes: 5,
      tags: ['青春18きっぷ', 'モデルコース'],
    },
    {
      title: '雨の日の旅支度チェックリスト',
      excerpt: '座席・窓・機材の相性で快適度が激変。防水と乾燥、カメラの結露対策まで一気に確認。',
      author: '旅人B',
      readingMinutes: 4,
      tags: ['装備', 'チェックリスト'],
      coverImageSrc: '/space-4888643_1280.jpg',
    },
    {
      title: 'JR全線乗りつぶしのはじめ方',
      excerpt: '記録方法・優先エリアの決め方・季節回し。挫折しない進め方をロードマップで共有。',
      author: '編集部',
      readingMinutes: 9,
      tags: ['乗りつぶし', '計画'],
    },
    {
      title: '車窓を撮る: 失敗しないシャッター設定',
      excerpt: '反射・ブレ・トンネル。条件別にISOとSSの目安を一覧化。スマホ派にも効く小ワザつき。',
      author: '旅人C',
      readingMinutes: 6,
      tags: ['撮影', 'Tips'],
    },
    {
      title: '北の大地を縦断: 特急でつなぐ大移動',
      excerpt: '長距離でも疲れにくい配席と停車駅攻略。乗継割引とホテル連携でコスト最適化。',
      author: '編集部',
      readingMinutes: 8,
      tags: ['特急', '長距離'],
      coverImageSrc: '/space-4888643_1280.jpg',
    },
    {
      title: '乗換時間5分の戦略: ホーム位置を読む',
      excerpt: '駅図・番線・編成両数から降車号車を逆算。実地検証で体感3分短縮のテクニック。',
      author: '旅人A',
      readingMinutes: 5,
      tags: ['乗り換え', 'ルート設計'],
    },
    {
      title: '編集後記: 今月のアップデートまとめ',
      excerpt: '路線データの更新、ルート評価の改善、UI微調整など、開発の裏側をさらりと振り返り。',
      author: 'Marutabi Team',
      readingMinutes: 3,
      tags: ['アップデート', 'プロダクト'],
    },
  ];
  return base.map((b, i) => ({
    slug: `sample-${i + 1}`,
    date: new Date(now - i * 86400000).toISOString(),
    ...b,
  }));
}

export default async function BlogPage() {
  const blogs = mockBlogs();
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold">ブログ</h1>
              <p className="text-muted-foreground mt-1 text-sm">旅の作り方やプロダクトアップデートなどを紹介します</p>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input placeholder="記事を検索" aria-label="記事を検索" />
              <Select defaultValue="all" aria-label="タグで絞り込み">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="タグで絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのタグ</SelectItem>
                  <SelectItem value="plan">プランニング</SelectItem>
                  <SelectItem value="rail">鉄道</SelectItem>
                  <SelectItem value="tips">コツ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b) => (
                <BlogCard key={b.slug} {...b} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <button className="h-9 rounded-md border px-3 text-sm text-foreground hover:bg-muted/40 disabled:opacity-50" disabled>
                前へ
              </button>
              <div className="text-sm text-muted-foreground">1 / 3</div>
              <button className="h-9 rounded-md border px-3 text-sm text-foreground hover:bg-muted/40">次へ</button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="bg-muted w-full h-40" />
                  <CardContent className="pb-6">
                    <div className="mt-4 h-5 w-3/4 bg-muted rounded" />
                    <div className="mt-2 h-4 w-full bg-muted rounded" />
                    <div className="mt-2 h-4 w-2/3 bg-muted rounded" />
                    <div className="mt-4 h-4 w-1/3 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

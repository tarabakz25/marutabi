import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import BlogCard from '@/components/Blog/BlogCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

function mockBlogs() {
  const now = Date.now();
  return Array.from({ length: 9 }).map((_, i) => ({
    slug: `sample-${i + 1}`,
    title: `サンプル記事タイトル ${i + 1}`,
    excerpt:
      'これはモックの抜粋テキストです。旅の計画や振り返り、ルート作成のコツを紹介します。',
    author: 'Marutabi Team',
    date: new Date(now - i * 86400000).toISOString(),
    readingMinutes: 4 + (i % 6),
    tags: ['旅程', 'プランニング', i % 2 === 0 ? '鉄道' : 'コツ'],
    coverImageSrc: i % 3 === 0 ? '/space-4888643_1280.jpg' : undefined,
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

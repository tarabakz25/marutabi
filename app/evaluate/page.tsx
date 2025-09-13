"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RouteTimeline } from '@/components/Sidebar';
import type { RouteResult } from '@/lib/route';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
// Header はサーバーコンポーネントのため、このページ（クライアント）は直接読み込まない

type EvalResponse = {
  metrics: {
    totalTimeMinutes: number;
    totalFare: number;
    transferCount: number;
    totalDistance: number;
  };
  llm?: { reasons?: string[]; risks?: string[]; comment?: string } | { error: string };
  schedule?: { time: string; title: string; description?: string }[];
};

export default function EvaluatePage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [userComment, setUserComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('route_result');
      const img = sessionStorage.getItem('route_image') || '';
      if (!raw) {
        router.replace('/');
        return;
      }
      setImageUrl(img);
      const route = JSON.parse(raw);
      setRouteResult(route as RouteResult);
      const run = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/map/route/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route }),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setResult(data);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
        } finally {
          setLoading(false);
        }
      };
      run();
    } catch (e) {
      setError('初期化に失敗しました');
      setLoading(false);
    }
  }, [router]);

  const openShare = async () => {
    try {
      const token = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : Math.random().toString(36).slice(2);
      const origin = window.location.origin;
      const url = `${origin}/r/${token}`;
      setShareUrl(url);
      const res = await fetch(`/api/share?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setQrUrl(data.qrUrl);
      } else {
        setQrUrl('');
      }
      setShareOpen(true);
    } catch {
      setShareOpen(true);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };

  const addUserComment = () => {
    const v = userComment.trim();
    if (!v) return;
    setComments((prev) => [v, ...prev].slice(0, 20));
    setUserComment('');
  };

  const fmtFare = (yen: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(Math.round(yen));
  const fmtTime = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h > 0) return `${h}時間${r}分`;
    return `${r}分`;
  };

  // Timeline 用の selection を安全に整形（JSX内のキャスト回避）
  const timelineSelection = routeResult && routeResult.routeStations?.length >= 2
    ? {
        origin: routeResult.routeStations[0],
        destination: routeResult.routeStations[routeResult.routeStations.length - 1],
        vias: [],
      }
    : null;

  return (
    <div>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
      <main className="min-h-screen w-full px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold">ルート評価</h1>
            <div className="flex items-center gap-2">
              <Button onClick={openShare}>友達にシェア</Button>
              <Button variant="outline" onClick={() => router.back()}>戻る</Button>
            </div>
          </div>

          {imageUrl && (
            <div className="w-full flex items-center justify-center">
              <img src={imageUrl} alt="route" className="max-w-full max-h-[50vh] rounded border" />
            </div>
          )}

          {loading && (
            <div className="text-sm text-slate-600">評価中...</div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border bg-white p-4 flex flex-col items-center justify-center">
                  <div className="text-sm text-slate-600 mb-1">所要時間</div>
                  <div className="text-3xl font-bold">{fmtTime(result.metrics.totalTimeMinutes)}</div>
                </div>
                <div className="rounded border bg-white p-4 flex flex-col items-center justify-center">
                  <div className="text-sm text-slate-600 mb-1">合計料金</div>
                  <div className="text-3xl font-bold">{fmtFare(result.metrics.totalFare)}</div>
                </div>
              </div>

              {result.llm && !(result.llm as any).error && (
                <div className="rounded border bg-white p-4 space-y-2">
                  <div className="text-sm font-semibold">AI コメント</div>
                  {(result.llm as any).comment && (
                    <div className="text-sm text-slate-700">{(result.llm as any).comment}</div>
                  )}
                  {Array.isArray((result.llm as any).reasons) && ((result.llm as any).reasons.length > 0) && (
                    <ul className="list-disc pl-5 text-sm">
                      {((result.llm as any).reasons ?? []).map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {(result.llm as any).source && (
                    <div className="text-[11px] text-slate-500">source: {(result.llm as any).source}</div>
                  )}
                  {(result.llm as any).errorMessage && (
                    <div className="text-[11px] text-red-500">{(result.llm as any).errorMessage}</div>
                  )}
                </div>
              )}

              {Array.isArray(result.schedule) && result.schedule.length > 0 && (
                <div className="rounded border bg-white p-4 space-y-2">
                  <div className="text-sm font-semibold">おすすめタイムスケジュール</div>
                  <ul className="divide-y">
                    {result.schedule.map((it, idx) => (
                      <li key={idx} className="py-2 flex items-start gap-3">
                        <div className="text-sm font-mono min-w-12 text-slate-700">{it.time}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{it.title}</div>
                          {it.description && (
                            <div className="text-xs text-slate-600">{it.description}</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
            </div>
            {routeResult && (
              <aside className="hidden lg:block lg:col-span-1 p-0 overflow-y-auto">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold">ルート詳細</h2>
                  {routeResult.summary?.passes && routeResult.summary.passes.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
                      <div className="font-semibold text-amber-900">使用する切符</div>
                      <div className="mt-1 text-amber-900">{routeResult.summary.passes.join('、 ')}</div>
                    </div>
                  )}
                  {timelineSelection && (
                    <RouteTimeline selection={timelineSelection as any} routeResult={routeResult} />
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShareOpen(false)} />
            <div className="relative z-10 bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4 space-y-3">
              <div className="text-base font-semibold text-center">シェア</div>
              <div className="text-xs break-words p-2 rounded bg-slate-50 border">{shareUrl || 'URLを生成中...'}</div>
              {qrUrl ? (
                <div className="flex items-center justify-center">
                  <img src={qrUrl} alt="QR" className="w-40 h-40" />
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500">QRコードを生成中...</div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:flex-1" onClick={copyShareUrl}>URLをコピー</Button>
                <Button variant="outline" className="w-full sm:flex-1" onClick={() => setShareOpen(false)}>閉じる</Button>
              </div>
            </div>
          </div>
        )}
      </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}


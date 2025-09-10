"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type EvalResponse = {
  composite?: { score: number; breakdown: { timeScore: number; fareScore: number; transferScore: number; distanceScore: number } };
  llm?: { score?: number; reasons?: string[]; risks?: string[]; comment?: string } | { error: string };
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

  const compositeScore = result?.composite?.score ?? 0;
  const gaugeAngle = useMemo(() => Math.min(360, Math.max(0, Math.round((compositeScore / 100) * 360))), [compositeScore]);

  return (
    <main className="min-h-screen w-full px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">ルート評価</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded border bg-white p-4 flex flex-col items-center justify-center">
                <div className="text-sm text-slate-600 mb-2">合成スコア</div>
                <div className="relative" style={{ width: 160, height: 160 }}>
                  <svg viewBox="0 0 120 120" width={160} height={160}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    <g transform="rotate(-90 60 60)">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#22C55E" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${Math.max(1, Math.round((gaugeAngle/360)*2*Math.PI*54))} ${Math.round(2*Math.PI*54)}`} />
                    </g>
                    <text x="60" y="66" textAnchor="middle" fontSize="28" fontWeight="700" fill="#111827">{compositeScore}</text>
                  </svg>
                </div>
              </div>
              <div className="md:col-span-2 rounded border bg-white p-4">
                <div className="text-sm text-slate-600 mb-3">内訳</div>
                <div className="space-y-2">
                  <Bar name="時間" value={result.composite!.breakdown.timeScore} color="#3B82F6" />
                  <Bar name="運賃" value={result.composite!.breakdown.fareScore} color="#22C55E" />
                  <Bar name="乗換" value={result.composite!.breakdown.transferScore} color="#F97316" />
                  <Bar name="距離" value={result.composite!.breakdown.distanceScore} color="#A855F7" />
                </div>
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

            <div className="rounded border bg-white p-4 space-y-3">
              <div className="text-sm font-semibold">あなたの評価コメント</div>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="このルートについて感じたこと、良かった点/気になった点を教えてください"
                className="w-full border rounded px-3 py-2 text-sm min-h-24"
              />
              <div className="flex justify-end">
                <Button onClick={addUserComment}>コメントを追加</Button>
              </div>
              {comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map((c, i) => (
                    <div key={i} className="text-sm p-2 border rounded bg-slate-50">{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
  );
}

function Bar({ name, value, color }: { name: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{name}</span>
        <span>{v}</span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded">
        <div className="h-3 rounded" style={{ width: `${v}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}


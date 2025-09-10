"use client";

import { useEffect, useState } from 'react';
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

  return (
    <main className="min-h-screen w-full px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">ルート評価</h1>
          <Button variant="outline" onClick={() => router.back()}>戻る</Button>
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
          <div className="space-y-3">
            {result.composite && (
              <div className="rounded border bg-white p-3">
                <div className="text-base font-semibold">合成スコア: {result.composite.score}</div>
                <div className="grid grid-cols-2 gap-1 text-sm mt-1">
                  <div>時間: {result.composite.breakdown.timeScore}</div>
                  <div>運賃: {result.composite.breakdown.fareScore}</div>
                  <div>乗換: {result.composite.breakdown.transferScore}</div>
                  <div>距離: {result.composite.breakdown.distanceScore}</div>
                </div>
              </div>
            )}
            {result.llm && !(result.llm as any).error && (
              <div className="rounded border bg-white p-3">
                <div className="text-sm font-semibold">LLM スコア: {(result.llm as any).score ?? '—'}</div>
                {(result.llm as any).comment && (
                  <div className="text-sm text-slate-700 mt-1">{(result.llm as any).comment}</div>
                )}
                {Array.isArray((result.llm as any).reasons) && (
                  <ul className="list-disc pl-5 text-sm mt-1">
                    {((result.llm as any).reasons ?? []).map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}



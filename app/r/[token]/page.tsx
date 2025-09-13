"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Params = { params: { token: string } };

export default function PublicSharePage({ params }: Params) {
  const { token } = params;
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setShareInfo(data.share);
        }
      } catch {}
    };
    fetchShare();
  }, [token]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError(null);
      const res = await fetch('/api/share', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || '参加に失敗しました');
      }
      const data = await res.json().catch(() => ({}));
      setJoined(true);
      const tripId = data?.share?.tripId ?? shareInfo?.tripId;
      if (tripId) {
        router.push(`/trips/new?tripId=${encodeURIComponent(String(tripId))}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* ヘッダーセクション */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">共有された旅</h1>
            <p className="text-slate-600">チームに参加して一緒に旅を楽しみましょう</p>
          </div>

          {/* メインカード */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-teal-900 px-6 py-4">
              <h2 className="text-white text-lg font-semibold">
                {shareInfo?.title || '旅のプラン'}
              </h2>
              <p className="text-blue-100 text-sm">
                {shareInfo?.description || 'みんなで一緒に旅を計画しましょう'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 旅の詳細情報 */}
              {shareInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-700">作成者</span>
                    </div>
                    <p className="text-slate-600 ml-4">{shareInfo.creator_name || '匿名ユーザー'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-700">参加者数</span>
                    </div>
                    <p className="text-slate-600 ml-4">{shareInfo.member_count || 1}名</p>
                  </div>
                </div>
              )}

              {/* 参加に関する説明 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-slate-900">チーム参加の特典</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• 旅のプランの更新通知を受け取れます</li>
                      <li>• リアルタイムで変更を確認できます</li>
                      <li>• チームメンバーと連携できます</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* アクションボタンエリア */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    onClick={handleJoin} 
                    disabled={joining || joined}
                    className="bg-teal-900 hover:bg-teal-800 text-white disabled:opacity-50"
                  >
                    {joined ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        参加完了
                      </div>
                    ) : joining ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        参加中...
                      </div>
                    ) : (
                      'チームに参加する'
                    )}
                  </Button>
                  
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm">{error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* デバッグ情報（開発環境でのみ表示） */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                    デバッグ情報
                  </summary>
                  <div className="mt-2 p-3 bg-slate-100 rounded text-xs text-slate-600 font-mono">
                    <div>Token: {token}</div>
                    <div>Share ID: {shareInfo?.id ?? '—'}</div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
      </main>
  );
}



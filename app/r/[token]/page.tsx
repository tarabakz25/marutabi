"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Params = { params: { token: string } };

export default function PublicSharePage({ params }: Params) {
  const { token } = params;
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
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">共有された旅</h1>
        <div className="text-sm text-slate-600">token: {token}</div>
        <div className="rounded-lg border p-6 bg-white space-y-3">
          <div className="text-sm text-slate-700">この旅のチームに参加すると、更新通知を受け取れます。</div>
          <div className="text-xs text-slate-500">共有ID: {shareInfo?.id ?? '—'}</div>
          <div className="flex items-center gap-2">
            <Button onClick={handleJoin} disabled={joining || joined}>
              {joined ? '参加済み' : joining ? '参加中...' : 'チームに参加する'}
            </Button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </main>
  );
}



"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, HeartOff, Share2, Loader2, X, Copy } from "lucide-react";

export type TripCardProps = {
  trip: {
    id: string;
    title: string;
    updatedAt: string;
  };
  rating?: { stars: number; isPublic: boolean } | null;
};

export default function TripCard(props: TripCardProps) {
  const { trip, rating } = props;
  const [liked, setLiked] = useState<boolean | null>(null);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  const [liking, setLiking] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const displayStars = useMemo(() => {
    const n = Math.floor(Number(rating?.stars ?? 0));
    return Math.max(0, Math.min(5, n));
  }, [rating?.stars]);

  useEffect(() => {
    let aborted = false;
    async function load() {
      try {
        const res = await fetch(`/api/likes?tripId=${encodeURIComponent(trip.id)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        setLiked(Boolean(data?.likedByMe));
        setTotalLikes(Number(data?.total ?? 0));
      } catch {
        // noop
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [trip.id]);

  const updatedJp = useMemo(() => new Date(trip.updatedAt).toLocaleString("ja-JP"), [trip.updatedAt]);

  const onToggleLike: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const prevLiked = liked === true;
    const prevTotal = totalLikes;
    // optimistic update
    setLiked(!prevLiked);
    setTotalLikes(prevLiked ? Math.max(0, prevTotal - 1) : prevTotal + 1);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      if (res.status === 401) {
        // revert
        setLiked(prevLiked);
        setTotalLikes(prevTotal);
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        // revert
        setLiked(prevLiked);
        setTotalLikes(prevTotal);
        return;
      }
      const data = await res.json();
      if (typeof data?.liked === "boolean") setLiked(Boolean(data.liked));
      if (typeof data?.total === "number") setTotalLikes(Number(data.total));
    } catch {
      // revert
      setLiked(prevLiked);
      setTotalLikes(prevTotal);
    } finally {
      setLiking(false);
    }
  };

  const onShare: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const token: string | undefined = data?.share?.token;
      if (!token) return;
      const url = `${window.location.origin}/r/${token}`;
      setShareUrl(url);
      try {
        const qrRes = await fetch(`/api/share?url=${encodeURIComponent(url)}`, { cache: "no-store" });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          const qru = String(qrData?.qrUrl ?? "");
          if (qru) setQrUrl(qru);
        }
      } catch {}
      setShareOpen(true);
    } catch {
      // noop
    } finally {
      setSharing(false);
    }
  };

  const onCopyUrl: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Link
      href={`/trips/new?tripId=${trip.id}`}
      className="rounded-lg border p-4 bg-white hover:shadow-sm transition block"
    >
      <div className="text-base font-medium mb-1">{trip.title}</div>
      <div className="text-xs text-slate-500">更新: {updatedJp}</div>
      {rating && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-yellow-600 text-sm">
            {"★".repeat(displayStars)}{"☆".repeat(5 - displayStars)}
          </div>
          <div className="text-[11px] text-slate-500">{rating.isPublic ? "公開" : "非公開"}</div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="お気に入り"
          onClick={onToggleLike}
          disabled={liking}
          className="px-2"
          title="お気に入り"
        >
          {liking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : liked ? (
            <Heart className="size-4 text-rose-600 fill-rose-600" />
          ) : (
            <HeartOff className="size-4 text-slate-600" />
          )}
          <span className="ml-1 text-xs text-slate-600">{totalLikes}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="シェア"
          onClick={onShare}
          disabled={sharing}
          className="px-2"
          title="シェア"
        >
          {sharing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Share2 className="size-4 text-slate-600" />
          )}
        </Button>
      </div>
      {shareOpen && (
        <div className="mt-3 rounded-md border bg-slate-50 p-3" onClick={(e) => e.preventDefault()}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">共有</div>
            <button
              type="button"
              aria-label="閉じる"
              className="p-1 text-slate-500 hover:text-slate-700"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(false); }}
            >
              <X className="size-4" />
            </button>
          </div>
          {copied && (
            <div className="mb-2">
              <Alert>
                <AlertDescription>共有リンクをコピーしました</AlertDescription>
              </Alert>
            </div>
          )}
          {shareUrl && (
            <div className="flex items-center gap-2 mb-2">
              <input
                readOnly
                value={shareUrl}
                className="w-full rounded border px-2 py-1 text-xs bg-white"
                aria-label="共有URL"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-white"
                onClick={onCopyUrl}
              >
                <Copy className="size-3" /> コピー
              </button>
            </div>
          )}
          {qrUrl && (
            <div className="flex items-center justify-center">
              <img src={qrUrl} alt="共有QRコード" className="w-32 h-32" />
            </div>
          )}
        </div>
      )}
    </Link>
  );
}



"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type TripItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function UserMenuClient({ userName, userImage }: { userName?: string; userImage?: string }) {
  const router = useRouter();
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  const [tripsOpen, setTripsOpen] = useState(false);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTrips = async () => {
    setTripsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trips', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data?.trips) ? data.trips : [];
      setTrips(list.map((t: any) => ({ id: String(t.id), title: String(t.title ?? ''), updatedAt: String(t.updatedAt ?? '') })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="size-10 cursor-pointer">
            {userImage ? (
              <AvatarImage src={userImage} alt={userName ?? "user"} />
            ) : (
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuLabel>{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openTrips}>保存したルート</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              window.location.href = "/api/auth/signout";
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {tripsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTripsOpen(false)} />
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-[92%] max-w-md p-4 space-y-3">
            <div className="text-base font-semibold text-center">保存したルート</div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="max-h-80 overflow-y-auto divide-y border rounded">
              {loading && (
                <div className="p-3 text-sm text-slate-600">読み込み中...</div>
              )}
              {!loading && trips.length === 0 && (
                <div className="p-3 text-sm text-slate-600">保存されたルートはありません</div>
              )}
              {!loading && trips.map((t) => (
                <button
                  key={t.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent"
                  onClick={() => {
                    setTripsOpen(false);
                    router.push(`/?tripId=${encodeURIComponent(t.id)}`);
                  }}
                >
                  <div className="text-sm font-medium truncate">{t.title || '無題のルート'}</div>
                  <div className="text-[11px] text-slate-500">更新: {new Date(t.updatedAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setTripsOpen(false)}>閉じる</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



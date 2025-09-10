"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search } from "lucide-react";

type StationSearchResult = {
  id: string;
  name: string;
  position: [number, number];
};

export default function HeaderActions() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Notifications (dummy)
  const notifications = useMemo(
    () => [
      { id: "n1", title: "新しい公開旅", desc: "四国一周 3日が追加されました" },
      { id: "n2", title: "ルート評価完了", desc: "先ほどの検索結果の評価が完了" },
    ],
    []
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/map/stations/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data: StationSearchResult[] = await res.json();
        setResults(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex items-center gap-3">
      {/* Search box */}
      <div className="relative">
        <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-white min-w-64">
          <Search className="size-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="駅名を検索"
            className="outline-none text-sm flex-1"
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && (results.length > 0 || loading || query) && (
          <div className="absolute z-50 mt-2 w-[28rem] max-w-[80vw] rounded-md border bg-white shadow-md">
            <div className="p-2 text-xs text-slate-500">
              {loading ? "検索中..." : results.length ? "候補" : "該当なし"}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined') {
                        const ev = new CustomEvent('map:flyTo', { detail: { position: r.position, station: r } });
                        window.dispatchEvent(ev);
                      }
                    } catch { /* ignore */ }
                    finally {
                      setQuery(r.name);
                      setOpen(false);
                    }
                  }}
                >
                  {r.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="notifications">
            <Bell className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>通知</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-slate-600">{n.desc}</div>
            </DropdownMenuItem>
          ))}
          {notifications.length === 0 && (
            <DropdownMenuItem disabled>通知はありません</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}



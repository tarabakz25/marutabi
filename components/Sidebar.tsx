"use client";

import { Button } from "@/components/ui/button";
import type { SelectionMode, SelectedStations } from "@/components/Map/types";
import type { RouteResult } from "@/lib/route";
import { FaCircle } from "react-icons/fa";
import { useState, useEffect } from 'react';

type StationSearchResult = {
  id: string;
  name: string;
  position: [number, number];
};
// Timeline component
const RouteTimeline = ({ selection, routeResult }: { selection: SelectedStations; routeResult: RouteResult }) => {
  const stations = [
    selection.origin,
    ...selection.vias,
    selection.destination,
  ].filter(Boolean);
  return (
    <div className="space-y-4">
      {stations.map((s, idx) => (
        <div key={s!.id + idx} className="flex items-start gap-3">
          {/* timeline bar */}
          <div className="flex flex-col items-center">
            <FaCircle className="text-primary w-3 h-3" />
            {idx !== stations.length - 1 && <div className="flex-1 w-px bg-slate-300 mt-0.5" />}
          </div>
          {/* station + segment info */}
          <div className="flex-1">
            <div className="font-medium text-sm">{s!.name}</div>
            {/* segment */}
            {idx < routeResult.geojson.features.length && (
              <div className="ml-1 mt-1 mb-3 rounded bg-slate-50 p-2 text-xs space-y-0.5">
                <div>路線: {routeResult.geojson.features[idx].properties?.operators?.join(', ') ?? '不明'}</div>
                <div>通過駅数: {routeResult.geojson.features[idx].properties?.stationCount ?? 0}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

type Props = {
  mode: SelectionMode;
  selection: SelectedStations;
  onChangeMode: (mode: SelectionMode) => void;
  onClearAll: () => void;
  onRemoveVia: (index: number) => void;
  onSearch: () => void;
  routeResult?: RouteResult | null;
};

export default function Sidebar({
  mode,
  selection,
  onChangeMode,
  onClearAll,
  onRemoveVia,
  onSearch,
  routeResult,
  onStationSelected,
}: Props & { onStationSelected: (s: StationSearchResult) => void; }) {

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StationSearchResult[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchResults = async () => {
      if (!query) { setResults([]); return; }
      try {
        const res = await fetch(`/api/map/stations/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data: StationSearchResult[] = await res.json();
        setResults(data);
      } catch { /* ignore */ }
    };
    const t = setTimeout(fetchResults, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  const isActive = (m: SelectionMode) =>
    mode === m ? "bg-primary text-primary-foreground" : "bg-accent/40";

  return (
    <aside className="h-full w-80 border-r bg-white/70 backdrop-blur p-4 flex flex-col gap-4">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">経路検索</h2>
        <p className="text-xs text-muted-foreground">地図上の駅をクリックして選択</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" className={isActive("origin")}
          onClick={() => onChangeMode("origin")}>出発</Button>
        <Button size="sm" variant="outline" className={isActive("destination")}
          onClick={() => onChangeMode("destination")}>到着</Button>
        <Button size="sm" variant="outline" className={isActive("via")}
          onClick={() => onChangeMode("via")}>経由</Button>
      </div>

      <div className="space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="駅名検索"
          className="w-full px-2 py-1 border rounded text-sm"
        />
        {results.length > 0 && (
          <div className="max-h-40 overflow-y-auto border rounded text-sm bg-white shadow">
            {results.map((r, idx) => (
              <div
                key={`${r.id}-${idx}`}
                className="px-2 py-1 hover:bg-accent cursor-pointer"
                onClick={() => { onStationSelected(r); setQuery(''); setResults([]); }}
              >
                {r.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">出発</div>
          <div className="font-medium truncate">
            {selection.origin?.name ?? "未選択"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">到着</div>
          <div className="font-medium truncate">
            {selection.destination?.name ?? "未選択"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">経由地点</div>
          <div className="flex flex-col gap-1">
            {selection.vias.length === 0 && (
              <div className="text-muted-foreground">なし</div>
            )}
            {selection.vias.map((v, idx) => (
              <div key={`${v.name}-${idx}`} className="flex items-center justify-between gap-2">
                <div className="truncate">{v.name}</div>
                <Button size="sm" variant="ghost" onClick={() => onRemoveVia(idx)}>×</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 検索結果 */}
      {routeResult && (
        <div className="space-y-2 mt-4 overflow-y-auto max-h-60 pr-1">
          <h3 className="text-base font-semibold">検索結果</h3>
          <RouteTimeline selection={selection} routeResult={routeResult} />
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Button onClick={onSearch} className="w-full">検索する</Button>
        <Button variant="outline" onClick={onClearAll} className="w-full">クリア</Button>
      </div>
    </aside>
  );
}
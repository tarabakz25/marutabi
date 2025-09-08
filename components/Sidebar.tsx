"use client";

import { Button } from "@/components/ui/button";
import type { SelectionMode, SelectedStations } from "@/components/Map/types";
import type { RouteResult } from "@/lib/route";

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
}: Props) {
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
        <div className="space-y-2 text-sm mt-4 overflow-y-auto max-h-60 pr-1">
          <h3 className="text-base font-semibold">検索結果</h3>
          {/* 経由駅名リスト */}
          {selection.vias.length > 0 && (
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">経由駅</div>
              <ul className="list-disc list-inside">
                {selection.vias.map((v) => (
                  <li key={v.id}>{v.name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 区間情報 */}
          {routeResult.geojson.features.map((f) => (
            <div key={f.properties?.seq} className="border rounded p-2 space-y-0.5">
              <div className="text-xs text-muted-foreground">区間 {f.properties?.seq + 1}</div>
              <div>通過駅数: {f.properties?.stationCount}</div>
              <div>距離: {(f.properties?.distance / 1000).toFixed(1)} km</div>
              <div>推定時間: {f.properties?.time.toFixed(1)} 分</div>
            </div>
          ))}

          {/* 利用路線名 / きっぷ名（簡易） */}
          <div className="text-xs text-muted-foreground">※ 路線名・きっぷ名の判定は開発中</div>
          <div className="border-t pt-2 text-sm font-medium">
            合計時間: {routeResult.summary.timeTotal.toFixed(1)} 分<br />
            合計距離: {(routeResult.summary.distanceTotal / 1000).toFixed(1)} km
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Button onClick={onSearch} className="w-full">検索する</Button>
        <Button variant="outline" onClick={onClearAll} className="w-full">クリア</Button>
      </div>
    </aside>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Map } from "@/components/Map";
import type { SelectedStations, StationSelection, SelectionMode } from "./types";
import type { RouteResult } from "@/lib/route";
type StationSearchResult = {
  id: string;
  name: string;
  position: [number, number];
  type?: "origin" | "destination" | "via";
  index?: number;
};

export default function MapWithSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<SelectionMode>("origin");
  const [selection, setSelection] = useState<SelectedStations>({
    origin: undefined,
    destination: undefined,
    vias: [],
  });
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const handleStationClick = (station: StationSelection) => {
    setSelection((prev) => {
      if (mode === "origin") {
        // 選択し直したら経路の整合性を保つ（出発更新時はそのまま）
        return { ...prev, origin: station };
      }
      if (mode === "destination") {
        return { ...prev, destination: station };
      }
      // via
      return { ...prev, vias: [...prev.vias, station] };
    });
    // 出発 → 到着 までは自動でモードを進める
    if (mode === "origin") setMode("destination");
    setFlyTo(station.position);
  };

  const handleClearAll = () => {
    setSelection({ origin: undefined, destination: undefined, vias: [] });
    setMode("origin");
  };

  const handleRemoveVia = (index: number) => {
    setSelection((prev) => ({
      ...prev,
      vias: prev.vias.filter((_, i) => i !== index),
    }));
  };

  const [routeGeojson, setRouteGeojson] = useState<any>({ type: "FeatureCollection", features: [] });
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchToken, setSearchToken] = useState<number>(0);
  const passIdsRef = useRef<string[] | null>(null);
  const [savedTripTitle, setSavedTripTitle] = useState<string>('');
  const [shouldResetView, setShouldResetView] = useState<number>(0);

  const handleSearch = () => {
    // selection should contain at least origin & destination
    if (!selection.origin || !selection.destination) return;
    setSearchToken(Date.now());
  };

  useEffect(() => {
    // tripId がある場合、保存済みをロードしてそのまま表示
    const tripId = searchParams?.get('tripId');
    if (!tripId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const trip = data?.trip;
        if (!trip || aborted) return;
        setSavedTripTitle(String(trip.title ?? ''));
        const sel = trip.selection ?? {};
        const route = trip.route;
        // selection を反映
        setSelection({
          origin: sel.origin ?? undefined,
          destination: sel.destination ?? undefined,
          vias: Array.isArray(sel.vias) ? sel.vias : [],
        });
        if (Array.isArray(sel.passIds)) passIdsRef.current = sel.passIds;
        // ルートを反映
        if (route?.geojson) {
          setRouteGeojson(route.geojson);
          setRouteResult(route);
        }
        // 最初の駅へ移動
        const p = sel.origin?.position ?? route?.routeStations?.[0]?.position ?? null;
        if (p) setFlyTo(p as [number, number]);
      } catch {}
    })();
    return () => { aborted = true; };
  }, [searchParams]);

  useEffect(() => {
    // Sidebar からの passIds 受信
    const onPassIds = (e: Event) => {
      const ce = e as CustomEvent<{ passIds: string[] }>;
      passIdsRef.current = Array.isArray(ce.detail?.passIds) ? ce.detail.passIds : [];
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('route:passIds', onPassIds as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('route:passIds', onPassIds as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    const points: StationSelection[] = [];
    if (selection.origin) points.push(selection.origin);
    points.push(...selection.vias);
    if (selection.destination) points.push(selection.destination);

    if (searchToken === 0) return;

    if (points.length < 2) {
      setRouteGeojson({ type: "FeatureCollection", features: [] });
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const body: any = {
          origin: selection.origin!.id,
          destination: selection.destination!.id,
          via: selection.vias.map((v) => v.id),
          priority: "optimal",
        };
        if (passIdsRef.current && passIdsRef.current.length > 0) {
          body.passIds = passIdsRef.current;
        }
        const res = await fetch(`/api/map/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: RouteResult = await res.json();
        setRouteGeojson(data.geojson);
        setRouteResult(data);
      } catch (e) {
        setRouteGeojson({ type: "FeatureCollection", features: [] });
        setRouteResult(null);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [searchToken]);

  const handleStationSelectedFromSearch = (res: StationSearchResult) => {
    const station: StationSelection = { id: res.id, name: res.name, position: res.position };

    // 経由駅の「変更」時は該当インデックスを置き換える
    if (res.type === "via" && typeof res.index === "number") {
      setSelection((prev) => {
        const targetIndex = Math.max(0, Math.min(res.index as number, Math.max(prev.vias.length - 1, 0)));
        const nextVias = [...prev.vias];
        if (targetIndex < nextVias.length) {
          nextVias[targetIndex] = station;
        } else {
          nextVias.push(station);
        }
        return { ...prev, vias: nextVias };
      });
      setFlyTo(station.position);
      return;
    }

    // 出発/到着、または新規経由は通常フロー
    handleStationClick(station);
  };

  // Listen to global flyTo events from header search
  useEffect(() => {
    const onFlyTo = (e: Event) => {
      const ce = e as CustomEvent<{ position: [number, number]; station?: StationSearchResult }>;
      const pos = ce.detail?.position;
      if (!pos) return;
      setFlyTo(pos);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('map:flyTo', onFlyTo as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('map:flyTo', onFlyTo as EventListener);
      }
    };
  }, []);

  // キャンバスのスクショ取得（deck.gl ラッパのDOMを対象に）
  const containerRef = useRef<HTMLDivElement | null>(null);
  const takeScreenshot = (): string | null => {
    try {
      const el = containerRef.current?.querySelector('canvas');
      if (!el) return null;
      const dataUrl = (el as HTMLCanvasElement).toDataURL('image/png');
      return dataUrl;
    } catch {
      return null;
    }
  };

  const handleEvaluateNavigate = (route: RouteResult) => {
    try {
      const img = takeScreenshot();
      sessionStorage.setItem('route_result', JSON.stringify(route));
      if (img) sessionStorage.setItem('route_image', img);
      router.push('/evaluate');
    } catch {
      router.push('/evaluate');
    }
  };

  // 検索結果から戻るときに駅表示とズームを初期化し固定
  const handleBackFromResults = () => {
    // ルート結果をクリアし、駅レイヤを通常表示に戻す
    setRouteGeojson({ type: "FeatureCollection", features: [] });
    setRouteResult(null);
    // ビューのリセットトリガー
    setShouldResetView(Date.now());
  };

  return (
    <div className="w-full h-[calc(100dvh-5rem)] relative">
      <Sidebar
        mode={mode}
        selection={selection}
        onChangeMode={setMode}
        onClearAll={handleClearAll}
        onRemoveVia={handleRemoveVia}
        onSearch={handleSearch}
        routeResult={routeResult}
        onStationSelected={handleStationSelectedFromSearch}
        onEvaluateNavigate={handleEvaluateNavigate}
        savedTitle={savedTripTitle}
        onBackFromResults={handleBackFromResults}
      />
      <div className="absolute inset-0" ref={containerRef}>
        <Map 
          onStationClick={handleStationClick} 
          selected={selection} 
          routeGeojson={routeGeojson} 
          routeOperators={routeResult?.summary.operators} 
          routeStations={routeResult?.routeStations} 
          flyTo={flyTo} 
          onLoadComplete={() => setMapLoaded(true)}
          shouldResetView={shouldResetView}
        />
        {routeResult?.summary?.passes && routeResult.summary.passes.length > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 z-40 flex flex-wrap gap-2 max-w-[80vw] justify-center">
            {routeResult.summary.passes.map((p) => (
              <span key={p} className="text-xs px-2 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 shadow-sm whitespace-nowrap">
                {p}
              </span>
            ))}
          </div>
        )}
        {error && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 text-xs shadow">{error}</div>
        )}
      </div>
      
      {/* 全画面ローディング表示 */}
      {(!mapLoaded) && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-lg font-medium">地図を読み込み中...</div>
          </div>
        </div>
      )}
      
      {/* 全画面計算中表示 */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-lg font-medium">ルートを計算中...</div>
          </div>
        </div>
      )}
    </div>
  );
}



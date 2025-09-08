"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Map } from "@/components/Map";
import type { SelectedStations, StationSelection, SelectionMode } from "./types";
import type { RouteResult } from "@/lib/route";

export default function MapWithSidebar() {
  const [mode, setMode] = useState<SelectionMode>("origin");
  const [selection, setSelection] = useState<SelectedStations>({
    origin: undefined,
    destination: undefined,
    vias: [],
  });

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
  const [error, setError] = useState<string | null>(null);
  const [searchToken, setSearchToken] = useState<number>(0);

  const handleSearch = () => {
    // selection should contain at least origin & destination
    if (!selection.origin || !selection.destination) return;
    setSearchToken(Date.now());
  };

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
        const body = {
          origin: selection.origin!.id,
          destination: selection.destination!.id,
          via: selection.vias.map((v) => v.id),
          priority: "optimal",
        };
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

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex">
      <Sidebar
        mode={mode}
        selection={selection}
        onChangeMode={setMode}
        onClearAll={handleClearAll}
        onRemoveVia={handleRemoveVia}
        onSearch={handleSearch}
        routeResult={routeResult}
      />
      <div className="flex-1 relative">
        <Map onStationClick={handleStationClick} selected={selection} routeGeojson={routeGeojson} />
        {loading && (
          <div className="absolute top-2 right-2 bg-white px-3 py-1 text-xs shadow">計算中...</div>
        )}
        {error && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 text-xs shadow">{error}</div>
        )}
      </div>
    </div>
  );
}



"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Map } from "@/components/Map";
import type { SelectedStations, StationSelection, SelectionMode } from "./types";

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

  const routeGeojson = useMemo(() => {
    const points: StationSelection[] = [];
    if (selection.origin) points.push(selection.origin);
    points.push(...selection.vias);
    if (selection.destination) points.push(selection.destination);

    if (points.length < 2) return { type: "FeatureCollection", features: [] };

    const features = [] as any[];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      features.push({
        type: "Feature",
        properties: { from: a.name, to: b.name, seq: i },
        geometry: { type: "LineString", coordinates: [a.position, b.position] },
      });
    }

    return { type: "FeatureCollection", features };
  }, [selection]);

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex">
      <Sidebar
        mode={mode}
        selection={selection}
        onChangeMode={setMode}
        onClearAll={handleClearAll}
        onRemoveVia={handleRemoveVia}
      />
      <div className="flex-1">
        <Map onStationClick={handleStationClick} selected={selection} routeGeojson={routeGeojson} />
      </div>
    </div>
  );
}



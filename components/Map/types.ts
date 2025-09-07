"use client";

export type LngLat = [number, number];

export type StationSelection = {
  name: string;
  position: LngLat;
};

export type SelectionMode = "origin" | "destination" | "via";

export type SelectedStations = {
  origin?: StationSelection;
  destination?: StationSelection;
  vias: StationSelection[];
};



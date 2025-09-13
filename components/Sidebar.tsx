"use client";

import { Button } from "@/components/ui/button";
import type { SelectionMode, SelectedStations } from "@/components/Map/types";
import type { RouteResult } from "@/lib/route";
import { FaCircle, FaPlus, FaTimes } from "react-icons/fa";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";

type StationSearchResult = {
  id: string;
  name: string;
  position: [number, number];
};

// Timeline component
export const RouteTimeline = ({ selection, routeResult }: { selection: SelectedStations; routeResult: RouteResult }) => {
  // 乗り換え駅の情報を取得する関数
  const getTransferInfo = (transferId: string) => {
    // まずrouteStationsから検索
    let station = routeResult.routeStations?.find(s => s.id === transferId);
    
    // 見つからない場合は、位置情報から最も近い駅を検索
    if (!station) {
      const transfer = routeResult.transfers?.find(t => t.id === transferId);
      if (transfer) {
        // 名前がある駅を優先して最近傍を取得
        const stations = routeResult.routeStations || [];
        const namedStations = stations.filter(s => !!s.name);
        const nearestNamed = namedStations.length > 0 ? findNearestStation(transfer.position, namedStations) : undefined;
        const nearestAny = findNearestStation(transfer.position, stations);
        station = nearestNamed ?? nearestAny ?? station;
      }
    }
    
    // 最終的なフォールバック処理
    if (!station) {
      // 駅IDから駅名を推測（例：駅IDが駅名を含んでいる場合）
      // 常に「乗換駅」と表示する
      return { id: transferId, name: '乗換駅', position: [0, 0] as [number, number] };
    }
    
    return station;
  };

  // 位置情報から最も近い駅を検索する関数
  const findNearestStation = (targetPos: [number, number], stations: Array<{ id: string; name?: string; position: [number, number] }>) => {
    let nearest: typeof stations[0] | undefined;
    let minDistance = Infinity;
    
    const haversine = (pos1: [number, number], pos2: [number, number]) => {
      const R = 6371000; // 地球の半径（メートル）
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(pos2[1] - pos1[1]);
      const dLon = toRad(pos2[0] - pos1[0]);
      const lat1 = toRad(pos1[1]);
      const lat2 = toRad(pos2[1]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    
    for (const station of stations) {
      const distance = haversine(targetPos, station.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }
    
    return nearest;
  };

  // 出発、経由、到着、乗換を「区間」順に構築
  const timelineItems: Array<{
    id: string;
    name: string;
    type: 'origin' | 'via' | 'destination' | 'transfer';
    position: [number, number];
    featureIndex?: number;
    sortOrder: number;
  }> = [];

  // features の seq 単位で区間内の分割数(=推定乗換回数+1)を数える
  const features = routeResult.geojson?.features ?? [];
  const featuresPerSeq = new Map<number, number>();
  for (const f of features) {
    const seq = Number(((f as any).properties?.seq) ?? -1);
    if (seq >= 0) featuresPerSeq.set(seq, (featuresPerSeq.get(seq) ?? 0) + 1);
  }
  // 各 seq の features 開始インデックス（グローバル）を構築
  const featuresBaseForSeq = new Map<number, number>();
  {
    let acc = 0;
    const maxSeq = Math.max(-1, ...Array.from(featuresPerSeq.keys()));
    for (let s = 0; s <= maxSeq; s++) {
      featuresBaseForSeq.set(s, acc);
      acc += featuresPerSeq.get(s) ?? 0;
    }
  }

  // 挿入順（経路順）に並んだ transfers を各区間(seq)にマップ
  const orderedTransfers = [...(routeResult?.transfers ?? [])];
  const transfersBySeq = new Map<number, typeof orderedTransfers>();
  for (const t of orderedTransfers) {
    const seq = Number((t as any).seq);
    if (!Number.isFinite(seq)) continue;
    if (!transfersBySeq.has(seq)) transfersBySeq.set(seq, [] as any);
    (transfersBySeq.get(seq) as any).push(t);
  }
  // seqが無いtransferのフォールバック用
  const noSeqTransfers = orderedTransfers.filter(t => !Number.isFinite(Number((t as any).seq)));
  let noSeqPtr = 0;
  let sortOrder = 0;

  // 先頭: 出発（最初のseq=0の先頭区間に紐づけ）
  if (selection.origin) {
    const base0 = featuresBaseForSeq.get(0) ?? 0;
    timelineItems.push({ ...selection.origin, type: 'origin', featureIndex: base0, sortOrder: sortOrder++ });
  }

  // 区間数: 経由数 + 1（出発→最初の経由、…、最終経由→到着）
  const legCount = (selection.origin && selection.destination)
    ? (selection.vias.length + 1)
    : 0;
  for (let leg = 0; leg < legCount; leg++) {
    const base = featuresBaseForSeq.get(leg) ?? 0;
    const segParts = Math.max(1, featuresPerSeq.get(leg) ?? 1);
    const transfersNeeded = Math.max(0, segParts - 1);
    // まずseqに紐づく乗換を優先表示（k番目の乗換→乗換後は leg 内の feature index: base + (k+1)）
    const seqTransfers = transfersBySeq.get(leg) ?? [];
    if (seqTransfers.length > 0) {
      seqTransfers.forEach((t, k) => {
        const info = getTransferInfo(t.id);
        timelineItems.push({
          id: info.id,
          name: info.name || '乗換駅',
          type: 'transfer',
          position: info.position,
          featureIndex: base + Math.min(k + 1, Math.max(0, segParts - 1)),
          sortOrder: sortOrder++,
        });
      });
    } else if (transfersNeeded > 0) {
      // seqが無い場合は推定: 不足数だけ noSeqTransfers から消費
      for (let k = 0; k < transfersNeeded && noSeqPtr < noSeqTransfers.length; k++) {
        const t = noSeqTransfers[noSeqPtr++];
        const info = getTransferInfo(t.id);
        timelineItems.push({
          id: info.id,
          name: info.name || '乗換駅',
          type: 'transfer',
          position: info.position,
          featureIndex: base + Math.min(k + 1, Math.max(0, segParts - 1)),
          sortOrder: sortOrder++,
        });
      }
    }
    // 区間の終点（経由 or 到着）を追加（その区間の最後のfeatureに紐づけ）
    const nextStation = leg < selection.vias.length ? selection.vias[leg] : selection.destination;
    if (nextStation) {
      timelineItems.push({
        ...nextStation,
        type: leg < selection.vias.length ? 'via' : 'destination',
        featureIndex: base + Math.max(0, segParts - 1),
        sortOrder: sortOrder++,
      });
    }
  }

  const typeLabel = (t: 'origin' | 'via' | 'destination' | 'transfer') => ({
    origin: '出発',
    via: '経由',
    destination: '到着',
    transfer: '乗換',
  }[t]);

  const typeColor = (t: 'origin' | 'via' | 'destination' | 'transfer') => ({
    origin: 'text-green-600',
    via: 'text-blue-600',
    destination: 'text-red-600',
    transfer: 'text-amber-600',
  }[t]);

  const typeBgColor = (t: 'origin' | 'via' | 'destination' | 'transfer') => ({
    origin: 'bg-slate-100 text-slate-600',
    via: 'bg-slate-100 text-slate-600',
    destination: 'bg-slate-100 text-slate-600',
    transfer: 'bg-amber-100 text-amber-700',
  }[t]);

  // features を安全に参照（不足時は末尾を使う）
  const getFeatureForIndex = (i: number | undefined) => {
    const feats = routeResult.geojson.features;
    if (!feats || feats.length === 0) return undefined as any;
    const idx = Math.min(Math.max(0, i ?? 0), feats.length - 1);
    return feats[idx];
  };
  return (
    <div className="space-y-4">
      {timelineItems.map((item, idx) => {
        const featureHere = getFeatureForIndex(item.featureIndex);
        const lineName = featureHere?.properties?.lineName ?? featureHere?.properties?.operators?.join(', ') ?? '不明';
        const stationCount = featureHere?.properties?.stationCount ?? 0;
        return (
          <div key={item.id + idx} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <FaCircle className={`${typeColor(item.type)} w-3 h-3`} />
              {idx !== timelineItems.length - 1 && <div className="flex-1 w-px bg-slate-300 mt-0.5" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                <span className={`mr-2 inline-block px-1.5 py-0.5 text-[10px] rounded ${typeBgColor(item.type)}`}>
                  {typeLabel(item.type)}
                </span>
                {item.name}
              </div>
              {/* 非乗換: 路線名 + 通過駅数 */}
              {item.type !== 'transfer' && featureHere && (
                <div className="ml-1 mt-1 mb-3 rounded bg-slate-50 p-2 text-xs space-y-0.5">
                  <div>路線: {lineName}</div>
                  <div>通過駅数: {stationCount} 駅</div>
                </div>
              )}
              {/* 乗換: 乗換後の路線 + 通過駅数 */}
              {item.type === 'transfer' && featureHere && (
                <div className="ml-1 mt-1 mb-3 rounded bg-amber-50 p-2 text-xs space-y-0.5 border border-amber-100">
                  <div>乗換後: {lineName}</div>
                  <div>通過駅数: {stationCount} 駅</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
  onBackFromResults?: () => void;
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
  onEvaluateNavigate,
  savedTitle,
  onBackFromResults,
}: Props & { onStationSelected: (s: StationSearchResult) => void; onEvaluateNavigate?: (route: RouteResult) => void; savedTitle?: string }) {

  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StationSearchResult[]>([]);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const selectionSnapshotRef = useRef<{ originId?: string; destinationId?: string; viaIds: Array<string | undefined> }>({
    originId: undefined,
    destinationId: undefined,
    viaIds: [],
  });
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    composite?: { score: number; breakdown: { timeScore: number; fareScore: number; transferScore: number; distanceScore: number } };
    llm?: { score?: number; reasons?: string[]; risks?: string[]; comment?: string } | { error: string };
  } | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showEvalView, setShowEvalView] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [passes, setPasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedPassIds, setSelectedPassIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // LLM フリーパス推薦
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{ passIds: string[]; title: string; summary: string; reasons?: string[] }[] | null>(null);

  // Prefill saved title when provided
  useEffect(() => {
    if (savedTitle && !saveTitle) setSaveTitle(savedTitle);
  }, [savedTitle]);

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

  // 切符一覧ロード
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/map/passes', { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { id: string; name: string }[];
        setPasses(data);
      } catch { /* ignore */ }
    })();
    return () => controller.abort();
  }, []);

  // 選択が実際に変化したときだけ入力欄を閉じる
  useEffect(() => {
    if (!isEditing) return;
    if (activeInput === 'origin' && selection.origin?.id) {
      const before = selectionSnapshotRef.current.originId;
      if (selection.origin.id !== before) {
        setActiveInput(null);
        setQuery('');
        setResults([]);
        setIsEditing(false);
      }
    } else if (activeInput === 'destination' && selection.destination?.id) {
      const before = selectionSnapshotRef.current.destinationId;
      if (selection.destination.id !== before) {
        setActiveInput(null);
        setQuery('');
        setResults([]);
        setIsEditing(false);
      }
    } else if (typeof activeInput === 'number') {
      const beforeViaIds = selectionSnapshotRef.current.viaIds;
      const before = beforeViaIds[activeInput];
      const curr = selection.vias[activeInput]?.id;
      if (curr && curr !== before) {
        setActiveInput(null);
        setQuery('');
        setResults([]);
        setIsEditing(false);
      }
    }
  }, [selection, activeInput, isEditing]);

  // 検索結果が到着したら結果ビューを表示
  useEffect(() => {
    if (routeResult) {
      setShowResults(true);
      // 検索結果表示時は上部の駅選択UIを閉じる
      setActiveInput(null);
      setQuery('');
      setResults([]);
      setIsEditing(false);

      // 推薦の取得（右側表示用）
      const ops = routeResult?.summary?.operators ?? [];
      const distanceTotal = routeResult?.summary?.distanceTotal ?? 0;
      const timeTotal = routeResult?.summary?.timeTotal ?? 0;
      const transferCount = Array.isArray(routeResult?.transfers) ? routeResult.transfers.length : 0;
      setRecLoading(true);
      setRecError(null);
      setRecommendations(null);
      (async () => {
        try {
          const res = await fetch('/api/map/passes/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operators: ops, distanceTotal, timeTotal, transferCount }),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
          setRecommendations(recs);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setRecError(msg);
        } finally {
          setRecLoading(false);
        }
      })();
    }
  }, [routeResult]);

  const handleStationSelect = (station: StationSearchResult) => {
    if (activeInput === 'origin') {
      onStationSelected({ ...station, type: 'origin' } as any);
    } else if (activeInput === 'destination') {
      onStationSelected({ ...station, type: 'destination' } as any);
    } else if (typeof activeInput === 'number') {
      onStationSelected({ ...station, type: 'via', index: activeInput } as any);
    }
    // 選択後に入力欄を閉じる処理は useEffect で行う
  };

  const addViaStation = () => {
    selectionSnapshotRef.current = {
      originId: selection.origin?.id,
      destinationId: selection.destination?.id,
      viaIds: selection.vias.map(v => v?.id),
    };
    setIsEditing(true);
    setActiveInput(selection.vias.length);
    onChangeMode('via');
  };

  const removeViaStation = (index: number) => {
    onRemoveVia(index);
  };

  const closeInput = () => {
    setActiveInput(null);
    setQuery('');
    setResults([]);
    setIsEditing(false);
  };

  const handleEvaluate = async () => {
    if (!routeResult) return;
    // ページ遷移で行うため、ここでは遷移用コールバックのみ
    setQuery('');
    setResults([]);
    setShowEvalView(false);
    setEvalResult(null);
    setEvalError(null);
    onEvaluateNavigate?.(routeResult);
  };

  const openShare = async () => {
    try {
      const token = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : Math.random().toString(36).slice(2);
      const origin = window.location.origin;
      const url = `${origin}/r/${token}`;
      setShareUrl(url);
      const res = await fetch(`/api/share?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setQrUrl(data.qrUrl);
      } else {
        setQrUrl('');
      }
      setShareOpen(true);
    } catch {
      setShareOpen(true);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };

  return (
    <aside className="fixed inset-x-2 sm:left-4 sm:right-auto top-20 sm:top-24 bottom-24 z-40 rounded-xl sm:rounded-2xl border shadow-lg bg-white/90 backdrop-blur p-3 sm:p-4 flex flex-col gap-4 overflow-y-auto w-auto sm:w-[22rem]">
      {!showResults && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold">経路検索</h2>
          <p className="text-xs text-muted-foreground">駅名を入力するか地図上の駅をクリック</p>
        </div>
      )}

      {/* 駅名検索 */}
      {!showResults && activeInput !== null && (
        <div className="space-y-2 border-2 border-primary rounded p-3 bg-primary/5">
          <div className="text-sm font-medium text-primary">
            {activeInput === 'origin' && '出発駅を選択'}
            {activeInput === 'destination' && '到着駅を選択'}
            {typeof activeInput === 'number' && `経由駅${activeInput + 1}を選択`}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="駅名を入力"
            className="w-full px-3 py-2 border rounded text-sm"
            autoFocus
          />
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded text-sm bg-white shadow">
              {results.map((r, idx) => (
                <div
                  key={`${r.id}-${idx}`}
                  className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                  onClick={() => handleStationSelect(r)}
                >
                  {r.name}
                </div>
              ))}
            </div>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={closeInput}
            className="w-full"
          >
            キャンセル
          </Button>
        </div>
      )}

      {/* 駅選択リスト */}
      {!showResults && (
        <div className="space-y-3 relative">
          {/* 左側の縦ライン（丸同士を接続） */}
          <div className="absolute left-1 top-1 bottom-1 w-px bg-slate-300 pointer-events-none"></div>
          {/* 出発駅 */}
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <div className="flex-1">
              {selection.origin ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selection.origin.name}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      selectionSnapshotRef.current = {
                        originId: selection.origin?.id,
                        destinationId: selection.destination?.id,
                        viaIds: selection.vias.map(v => v?.id),
                      };
                      setIsEditing(true);
                      setActiveInput('origin');
                      onChangeMode('origin');
                    }}
                  >
                    変更
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => {
                    setActiveInput('origin');
                    onChangeMode('origin');
                  }}
                >
                  出発駅を選択
                </Button>
              )}
            </div>
          </div>
          
          {/* 経由駅 */}
          {selection.vias.map((via, index) => (
            <div key={`via-${index}`} className="flex items-center gap-2 relative z-10">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{via.name}</span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        selectionSnapshotRef.current = {
                          originId: selection.origin?.id,
                          destinationId: selection.destination?.id,
                          viaIds: selection.vias.map(v => v?.id),
                        };
                        setIsEditing(true);
                        setActiveInput(index);
                        onChangeMode('via');
                      }}
                    >
                      変更
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeViaStation(index)}
                    >
                      <FaTimes className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 経由駅追加 */}
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-blue-200"></div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 justify-start text-muted-foreground"
              onClick={addViaStation}
            >
              <FaPlus className="w-3 h-3 mr-2" />
              経由駅を追加
            </Button>
          </div>
          
          {/* 到着駅 */}
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="flex-1">
              {selection.destination ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selection.destination.name}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      selectionSnapshotRef.current = {
                        originId: selection.origin?.id,
                        destinationId: selection.destination?.id,
                        viaIds: selection.vias.map(v => v?.id),
                      };
                      setIsEditing(true);
                      setActiveInput('destination');
                      onChangeMode('destination');
                    }}
                  >
                    変更
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => {
                    setActiveInput('destination');
                    onChangeMode('destination');
                  }}
                >
                  到着駅を選択
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!showResults && <Separator />}

      {!showResults && (
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">地域に移動</h2>
          <div className="grid grid-cols-3 gap-2">
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [141.3545, 43.0618] as [number, number] } }));
            }}>北海道</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [140.8719, 38.2688] as [number, number] } }));
            }}>東北</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [139.767306, 35.681236] as [number, number] } }));
            }}>関東</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [137.2137, 36.6953] as [number, number] } }));
            }}>中部</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [135.5031, 34.6937] as [number, number] } }));
            }}>近畿</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [132.4553, 34.3853] as [number, number] } }));
            }}>中国</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [134.5593, 34.0657] as [number, number] } }));
            }}>四国</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [130.4181, 33.5904] as [number, number] } }));
            }}>九州</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={() => {
              window.dispatchEvent(new CustomEvent('map:flyTo', { detail: { position: [127.6809, 26.2124] as [number, number] } }));
            }}>沖縄</Button>
          </div>
        </div>
      )}

      {/* 検索結果 / 評価ビュー */}
      {routeResult && showResults && !showEvalView && (
        <div className="space-y-2 mt-4 overflow-y-auto flex-1 pr-1">
          <h3 className="text-base font-semibold">検索結果</h3>
          {routeResult.summary?.passes && routeResult.summary.passes.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
              <div className="font-semibold text-amber-900">使用する切符</div>
              <div className="mt-1 text-amber-900">
                {routeResult.summary.passes.join('、 ')}
              </div>
            </div>
          )}
          <RouteTimeline selection={selection} routeResult={routeResult} />
          {evalError && (
            <div className="text-xs text-red-600">{evalError}</div>
          )}

          {/* 右側推奨（このサイドバー内の下部に表示）*/}
          <div className="mt-3 rounded border bg-white">
            <div className="px-3 py-2 border-b text-sm font-semibold flex items-center gap-2">
              <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 border border-emerald-200">LLM</span>
              おすすめのフリーきっぷ
            </div>
            <div className="p-3 space-y-2">
              {recLoading && (
                <div className="text-xs text-slate-500">おすすめを生成中...</div>
              )}
              {recError && (
                <div className="text-xs text-red-600">{recError}</div>
              )}
              {!recLoading && !recError && Array.isArray(recommendations) && recommendations.length === 0 && (
                <div className="text-xs text-slate-500">該当するおすすめは見つかりませんでした。</div>
              )}
              {!recLoading && !recError && Array.isArray(recommendations) && recommendations.length > 0 && (
                <div className="space-y-2">
                  {recommendations.map((r, idx) => (
                    <div key={idx} className="rounded border bg-slate-50 p-2">
                      <div className="text-sm font-medium mb-0.5">{r.title}</div>
                      <div className="text-xs text-slate-700 mb-1">{r.summary}</div>
                      {Array.isArray(r.reasons) && r.reasons.length > 0 && (
                        <ul className="list-disc pl-5 text-xs text-slate-700">
                          {r.reasons.slice(0, 4).map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {Array.isArray(r.passIds) && r.passIds.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.passIds.map((id) => (
                            <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900">{id}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {routeResult && showEvalView && (
        <div className="space-y-2 mt-4 overflow-y-auto flex-1 pr-1">
          <h3 className="text-base font-semibold">評価結果</h3>
          {evalResult?.composite && (
            <div className="rounded border bg-white p-3 text-sm space-y-2">
              <div className="text-base font-semibold">合成スコア: {evalResult.composite.score}</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>時間: {evalResult.composite.breakdown.timeScore}</div>
                <div>運賃: {evalResult.composite.breakdown.fareScore}</div>
                <div>乗換: {evalResult.composite.breakdown.transferScore}</div>
                <div>距離: {evalResult.composite.breakdown.distanceScore}</div>
              </div>
            </div>
          )}
          {evalResult?.llm && !(evalResult.llm as any).error && (
            <div className="rounded border bg-white p-3 text-sm space-y-2">
              <div className="text-sm font-semibold">LLM スコア: {(evalResult.llm as any).score ?? '—'}</div>
              {(evalResult.llm as any).comment && (
                <div className="text-xs text-slate-700">{(evalResult.llm as any).comment}</div>
              )}
              {Array.isArray((evalResult.llm as any).reasons) && (
                <ul className="list-disc pl-5 text-xs">
                  {((evalResult.llm as any).reasons ?? []).map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {evalError && (
            <div className="text-xs text-red-600">{evalError}</div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {!showEvalView ? (
          !showResults ? (
            <>
              <Button onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('route:passIds', { detail: { passIds: selectedPassIds } }));
                }
                onSearch();
              }} className="w-1/2">検索する</Button>
              <Button variant="outline" onClick={onClearAll} className="w-1/2">クリア</Button>
            </>
          ) : (
            <>
              <Button onClick={handleEvaluate} disabled={evaluating} className="w-1/2 bg-teal-900 hover:bg-teal-700 ">レポート作成</Button>
              <Button 
                variant="outline" 
                onClick={() => { 
                  try { onBackFromResults?.(); } catch {}
                  setShowResults(false); 
                }} 
                className="w-1/2"
              >戻る</Button>
            </>
          )
        ) : (
          <>
            <Button onClick={openShare} className="w-full">友達にシェア</Button>
            <Button variant="outline" onClick={() => setShowEvalView(false)} className="w-full">戻る</Button>
          </>
        )}
      </div>


      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShareOpen(false)} />
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4 space-y-3">
            <div className="text-base font-semibold text-center">シェア</div>
            <div className="text-xs break-words p-2 rounded bg-slate-50 border">{shareUrl || 'URLを生成中...'}</div>
            {qrUrl ? (
              <div className="flex items-center justify-center">
                <img src={qrUrl} alt="QR" className="w-40 h-40" />
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500">QRコードを生成中...</div>
            )}
            <div className="flex gap-2">
              <Button className="w-full" onClick={copyShareUrl}>URLをコピー</Button>
              <Button variant="outline" className="w-full" onClick={() => setShareOpen(false)}>閉じる</Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
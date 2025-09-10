"use client";

import { Button } from "@/components/ui/button";
import type { SelectionMode, SelectedStations } from "@/components/Map/types";
import type { RouteResult } from "@/lib/route";
import { FaCircle, FaPlus, FaTimes } from "react-icons/fa";
import { useState, useEffect } from 'react';

type StationSearchResult = {
  id: string;
  name: string;
  position: [number, number];
};

// Timeline component
const RouteTimeline = ({ selection, routeResult }: { selection: SelectedStations; routeResult: RouteResult }) => {
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

  // 出発、経由、到着、乗り換えを統合したタイムラインを作成
  const timelineItems: Array<{
    id: string;
    name: string;
    type: 'origin' | 'via' | 'destination' | 'transfer';
    position: [number, number];
    featureIndex?: number;
    sortOrder: number;
  }> = [];

  // 基本的な駅の順序を設定
  let sortOrder = 0;

  // 出発駅を追加
  if (selection.origin) {
    timelineItems.push({
      ...selection.origin,
      type: 'origin',
      sortOrder: sortOrder++
    });
  }

  // 経由駅を追加
  selection.vias.forEach((via, index) => {
    timelineItems.push({
      ...via,
      type: 'via',
      sortOrder: sortOrder++
    });
  });

  // 到着駅を追加
  if (selection.destination) {
    timelineItems.push({
      ...selection.destination,
      type: 'destination',
      sortOrder: sortOrder++
    });
  }

  // 乗り換え駅を適切な位置に挿入
  const transfers = routeResult?.transfers ?? [];
  transfers.forEach(transfer => {
    const transferInfo = getTransferInfo(transfer.id);
    // 乗り換え駅が既存のタイムラインアイテムと重複しない場合のみ追加
    const isDuplicate = timelineItems.some(item => item.id === transfer.id);
    if (!isDuplicate) {
      // 乗り換え駅を適切な位置に挿入（簡易的に最後に追加）
      timelineItems.push({
        id: transferInfo.id,
        name: transferInfo.name || '乗換駅',
        type: 'transfer',
        position: transferInfo.position,
        sortOrder: sortOrder++
      });
    }
  });

  // タイムラインアイテムをソート（出発→経由→乗り換え→到着の順序を維持）
  timelineItems.sort((a, b) => {
    // まず基本的な順序でソート
    if (a.type === 'origin' && b.type !== 'origin') return -1;
    if (b.type === 'origin' && a.type !== 'origin') return 1;
    if (a.type === 'destination' && b.type !== 'destination') return 1;
    if (b.type === 'destination' && a.type !== 'destination') return -1;
    
    // 同じタイプ内ではsortOrderでソート
    return a.sortOrder - b.sortOrder;
  });

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

  return (
    <div className="space-y-4">
      {timelineItems.map((item, idx) => (
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
            {item.type !== 'transfer' && idx < routeResult.geojson.features.length && (
              <div className="ml-1 mt-1 mb-3 rounded bg-slate-50 p-2 text-xs space-y-0.5">
                <div>路線: {routeResult.geojson.features[idx].properties?.lineName ?? routeResult.geojson.features[idx].properties?.operators?.join(', ') ?? '不明'}</div>
                <div>距離: {Math.round(routeResult.geojson.features[idx].properties?.distance ?? 0)} m</div>
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
  onEvaluateNavigate,
}: Props & { onStationSelected: (s: StationSearchResult) => void; onEvaluateNavigate?: (route: RouteResult) => void; }) {

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StationSearchResult[]>([]);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | number | null>(null);
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

  // 選択が完了した時に入力欄を自動で閉じる
  useEffect(() => {
    if (activeInput === 'origin' && selection.origin) {
      setActiveInput(null);
      setQuery('');
      setResults([]);
    } else if (activeInput === 'destination' && selection.destination) {
      setActiveInput(null);
      setQuery('');
      setResults([]);
    } else if (typeof activeInput === 'number' && selection.vias[activeInput]) {
      setActiveInput(null);
      setQuery('');
      setResults([]);
    }
  }, [selection, activeInput]);

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
    <aside className="h-full w-80 border-r bg-white/70 backdrop-blur p-4 flex flex-col gap-4">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">経路検索</h2>
        <p className="text-xs text-muted-foreground">駅名を入力するか地図上の駅をクリック</p>
      </div>

      {/* 駅名検索 */}
      {activeInput !== null && (
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
      <div className="space-y-3">
        {/* 出発駅 */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <div className="flex-1">
            {selection.origin ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selection.origin.name}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
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
          <div key={`via-${index}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{via.name}</span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
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
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="flex-1">
            {selection.destination ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selection.destination.name}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
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

      {/* 検索結果 / 評価ビュー */}
      {routeResult && !showEvalView && (
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
          <div className="pt-2 space-y-2">
            <Button onClick={handleEvaluate} disabled={evaluating} className="w-full">
              {evaluating ? '評価中...' : '評価する'}
            </Button>
            {evalError && (
              <div className="text-xs text-red-600">{evalError}</div>
            )}
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

      <div className="mt-auto flex gap-2">
        {!showEvalView ? (
          <>
            <Button onClick={onSearch} className="w-full">検索する</Button>
            <Button variant="outline" onClick={onClearAll} className="w-full">クリア</Button>
          </>
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
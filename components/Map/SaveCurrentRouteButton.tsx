"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SelectedStations } from "./types";
import type { RouteResult } from "@/lib/route";

export default function SaveCurrentRouteButton({
  selection,
  routeResult,
  passIdsRef,
}: {
  selection: SelectedStations;
  routeResult: RouteResult | null;
  passIdsRef: React.MutableRefObject<string[] | null>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !routeResult;

  const handleSave = async () => {
    if (!routeResult) return;
    const name = (title || '').trim() || '未名の旅';
    const selectionToSave: any = {
      origin: selection.origin ?? null,
      destination: selection.destination ?? null,
      vias: Array.isArray(selection.vias) ? selection.vias : [],
      passIds: Array.isArray(passIdsRef.current) ? passIdsRef.current : [],
    };
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, selection: selectionToSave, route: routeResult }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || '保存に失敗しました');
      }
      setOpen(false);
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)} className="bg-teal-900 hover:bg-teal-700">保存</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4 space-y-3">
            <div className="text-base font-semibold text-center">ルートを保存</div>
            <div className="space-y-2">
              <div className="text-xs text-slate-600">保存する名前</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 東京→大阪 最短ルート" />
              {error && (<div className="text-xs text-red-600">{error}</div>)}
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={!routeResult || saving}>{saving ? '保存中...' : '保存'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>閉じる</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



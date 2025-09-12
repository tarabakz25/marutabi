import Link from 'next/link';

type Params = { params: { id: string } };

async function fetchTrip(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/trips/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.trip ?? null) as any;
}

export default async function TripDetailPage({ params }: Params) {
  const { id } = params;
  const trip = await fetchTrip(id);
  if (!trip) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="max-w-5xl">
          <div className="rounded-lg border p-6 bg-white">見つかりませんでした</div>
        </div>
      </main>
    );
  }
  const selection = trip.selection ?? {};
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{trip.title}</h1>
          <Link href="/trips" className="text-sm text-slate-600 underline">一覧に戻る</Link>
        </div>
        <div className="rounded-lg border p-6 bg-white space-y-3">
          <div className="text-sm text-slate-600">更新: {new Date(trip.updatedAt).toLocaleString('ja-JP')}</div>
          <div className="text-sm">出発: {selection.origin?.name ?? '—'}</div>
          <div className="text-sm">到着: {selection.destination?.name ?? '—'}</div>
          {Array.isArray(selection.vias) && selection.vias.length > 0 && (
            <div className="text-sm">経由: {selection.vias.map((v: any) => v.name).join(' / ')}</div>
          )}
        </div>
        <div className="rounded-lg border p-6 bg-white space-y-3">
          <div className="text-base font-semibold">ルートの再評価</div>
          <form action={`/evaluate`}>
            {/* sessionStorage を使うためクライアントページからの遷移推奨。ここではリンク案内のみ */}
            <div className="text-sm text-slate-600">/trips から選択後、地図で再検索して評価ページへ遷移してください。</div>
          </form>
        </div>
      </div>
    </main>
  );
}



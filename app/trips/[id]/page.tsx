type Params = { params: { id: string } };

export default function TripDetailPage({ params }: Params) {
  const { id } = params;
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold mb-4">Trip 詳細（ダミー）</h1>
        <div className="rounded-lg border p-6 bg-white">
          <div className="text-sm text-slate-600 mb-2">id: {id}</div>
          <div className="text-slate-700">概要 / ルート / コメント（今後実装）</div>
        </div>
      </div>
    </main>
  );
}



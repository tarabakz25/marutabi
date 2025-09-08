type Params = { params: { token: string } };

export default function PublicSharePage({ params }: Params) {
  const { token } = params;
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">共有された旅</h1>
        <div className="text-sm text-slate-600 mb-6">token: {token}</div>
        <div className="rounded-lg border p-6 bg-white">
          <p className="text-slate-600">読み取り専用ビュー（MVPダミー）。地図とタイムラインを今後実装。</p>
        </div>
      </div>
    </main>
  );
}



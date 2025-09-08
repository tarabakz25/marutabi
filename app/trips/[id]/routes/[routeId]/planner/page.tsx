export default function PlannerPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Planner（ダミー）</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <form className="rounded-lg border p-6 bg-white space-y-4">
          <div>
            <label className="block text-sm mb-1">出発地</label>
            <input className="w-full rounded-md border px-3 py-2" placeholder="東京" />
          </div>
          <div>
            <label className="block text-sm mb-1">日数</label>
            <input type="number" className="w-full rounded-md border px-3 py-2" defaultValue={2} />
          </div>
          <div>
            <label className="block text-sm mb-1">テーマ</label>
            <select className="w-full rounded-md border px-3 py-2">
              <option>海沿い</option>
              <option>温泉</option>
              <option>18きっぷ</option>
              <option>費用最小</option>
            </select>
          </div>
          <button className="w-full px-4 py-2 rounded-md bg-black text-white">AI候補を生成</button>
        </form>
        <div className="md:col-span-2 rounded-lg border p-6 bg-white">
          <div className="text-slate-600">候補（ダミー）をここに並べる予定です。</div>
        </div>
      </div>
    </main>
  );
}



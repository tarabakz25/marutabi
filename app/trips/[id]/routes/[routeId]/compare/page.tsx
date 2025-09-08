export default function ComparePage() {
  const rows = [
    { name: '最短', time: '3:20', cost: '¥2,340', transfers: 1, score: 78 },
    { name: '海沿い', time: '4:10', cost: '¥1,980', transfers: 2, score: 82 },
    { name: '乗換少', time: '3:50', cost: '¥2,600', transfers: 0, score: 75 },
  ];
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Compare（ダミー）</h1>
      <div className="rounded-lg border overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2">候補</th>
              <th className="px-4 py-2">所要</th>
              <th className="px-4 py-2">費用</th>
              <th className="px-4 py-2">乗換</th>
              <th className="px-4 py-2">スコア</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.time}</td>
                <td className="px-4 py-2">{r.cost}</td>
                <td className="px-4 py-2">{r.transfers}</td>
                <td className="px-4 py-2">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}



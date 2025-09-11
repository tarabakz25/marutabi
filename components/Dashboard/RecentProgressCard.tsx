import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Progress = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  deltaXp: number;
  detail: string;
};

const mock: Progress[] = [
  { id: 'p1', date: '2025-09-10', title: '東北旅を追加', deltaXp: 420, detail: '距離 320km + 旅1回 + 1県' },
  { id: 'p2', date: '2025-09-05', title: '関東日帰り', deltaXp: 140, detail: '距離 120km + 旅1回' },
  { id: 'p3', date: '2025-08-28', title: '夏の巡礼', deltaXp: 760, detail: '距離 640km + 旅1回 + 2日' },
];

export default function RecentProgressCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>直近の進捗</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {mock.map((p) => (
            <li key={p.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-medium">{p.title}</div>
                <div className="text-xs text-amber-700 font-semibold">+{p.deltaXp} XP</div>
              </div>
              <div className="text-xs text-slate-500">{p.date}</div>
              <div className="mt-1 text-xs text-slate-600">{p.detail}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}



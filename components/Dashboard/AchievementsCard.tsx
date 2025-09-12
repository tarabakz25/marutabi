import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Medal } from "lucide-react";

type Stats = {
  distanceKm: number;
  tripsCount: number;
  visitedPrefectures: number;
  daysTraveled: number;
};

const mockStats: Stats = {
  distanceKm: 1243,
  tripsCount: 7,
  visitedPrefectures: 12,
  daysTraveled: 15,
};

const achievements = [
  {
    id: "first-trip",
    label: "初めての旅",
    earned: (s: Stats) => s.tripsCount >= 1,
  },
  {
    id: "ten-pref",
    label: "10県制覇",
    earned: (s: Stats) => s.visitedPrefectures >= 10,
  },
  {
    id: "thousand-km",
    label: "1000km突破",
    earned: (s: Stats) => s.distanceKm >= 1000,
  },
  {
    id: "week-travel",
    label: "7日間の旅",
    earned: (s: Stats) => s.daysTraveled >= 7,
  },
];

export default function AchievementsCard() {
  const stats = mockStats; // TODO: 将来APIから取得
  const items = achievements.map((a) => ({ id: a.id, label: a.label, done: a.earned(stats) }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>アチーブメント</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <div
              key={i.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${i.done ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}
              title={i.label}
            >
              {i.done ? (
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
              ) : (
                <Medal className="h-4 w-4 text-slate-400" />
              )}
              <span className={i.done ? 'text-amber-800' : 'text-slate-500'}>{i.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



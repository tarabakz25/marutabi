import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/authOptions";
import { Map, Medal, Route, Star, Trophy } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// 簡易XP/レベル計算（距離/回数/訪問都道府県/日数の合算）
function calculateXp(stats: {
  distanceKm: number;
  tripsCount: number;
  visitedPrefectures: number;
  daysTraveled: number;
}) {
  const distanceXp = Math.round(stats.distanceKm * 1); // 1km = 1XP
  const tripsXp = stats.tripsCount * 50;               // 1回 = 50XP
  const prefectureXp = stats.visitedPrefectures * 100; // 1都道府県 = 100XP
  const daysXp = stats.daysTraveled * 20;              // 1日 = 20XP
  return distanceXp + tripsXp + prefectureXp + daysXp;
}

// レベル曲線: 必要XP = 100 * level^2
function getLevelProgress(xp: number) {
  let level = 0;
  while (xp >= 100 * (level + 1) * (level + 1)) level += 1;
  const currentLevelXp = 100 * level * level;
  const nextLevel = level + 1;
  const nextLevelXp = 100 * nextLevel * nextLevel;
  const gained = xp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  const progress = Math.max(0, Math.min(1, required === 0 ? 1 : gained / required));
  return { level, progress, gained, required, nextLevel, nextLevelXp };
}

export default async function LevelCard() {
  const session = await getServerSession(authOptions);
  const userImage = (session?.user as any)?.image as string | undefined;
  const userName = (session?.user as any)?.name as string | undefined;
  const fallbackInitial = userName?.[0]?.toUpperCase() ?? "U";

  const stats = {
    distanceKm: 1243,
    tripsCount: 7,
    visitedPrefectures: 12,
    daysTraveled: 15,
  };

  const xp = calculateXp(stats);
  const { level, progress, gained, required, nextLevel } = getLevelProgress(xp);

  const progressPct = Math.round(progress * 100);


  return (
    <Card style={{
      backgroundImage: "url('/stacked-peaks-haikei.svg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }} className="text-white w-full">
      <CardHeader className="pb-2">
        <CardTitle>
          <h1 className="text-3xl font-bold">Trip Level</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage src={userImage} />
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <div className="text-3xl font-bold leading-none">Lv. <span className="text-6xl">{level}</span></div>
              <div className="mt-1 text-xs text-gray-50">次のレベルまで {required - gained} XP</div>
            </div>
          </div>
          <div className="text-xs text-gray-50">累計XP: {xp.toLocaleString()} XP</div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-gray-50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-50">
          <span>Lv.{level}</span>
          <span>{progressPct}%</span>
          <span>Lv.{nextLevel}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-gray-50 text-xs"><Route className="h-4 w-4" /> 距離</div>
            <div className="mt-1 text-lg font-semibold">{stats.distanceKm.toLocaleString()} km</div>
          </div>
          <div className="rounded-lg border  p-3">
            <div className="flex items-center gap-2 text-gray-50 text-xs"><Map className="h-4 w-4" /> 旅の回数</div>
            <div className="mt-1 text-lg font-semibold">{stats.tripsCount}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-gray-50 text-xs"><Star className="h-4 w-4" /> 訪問都道府県</div>
            <div className="mt-1 text-lg font-semibold">{stats.visitedPrefectures}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-gray-50 text-xs"><Trophy className="h-4 w-4" /> 旅した日数</div>
            <div className="mt-1 text-lg font-semibold">{stats.daysTraveled}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-1 text-right">
          <Link href="/trips/new" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">旅を計画する</Link>
        </div>
      </CardContent>
    </Card>
  )
}
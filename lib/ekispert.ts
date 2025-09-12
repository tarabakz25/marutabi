import { getCache, setCache } from "./cache";

const API_BASE = "https://api.ekispert.jp/v1/json";
const API_KEY = process.env.EKS_API_KEY;

if (!API_KEY) {
  console.warn("EKS_API_KEY is not set");
}

export interface CourseInfo {
  fare: number;
  time: number; // minutes
  distance: number; // km
}

export type Priority = "time" | "cost" | "optimal";

interface StationPoint {
  Station?: { code?: string };
}

interface StationCodeResponse {
  ResultSet?: { Point?: StationPoint | StationPoint[] };
}

interface CoursePrice {
  Kind?: string;
  kind?: string;
  type?: string;
  Name?: string;
  Oneway?: string;
  OneWay?: string;
  Fare?: string;
  value?: string;
}

interface CourseData {
  Price?: CoursePrice | CoursePrice[];
  TimeOnBoard?: string;
  TimeOther?: string;
  Distance?: string;
}

interface CourseResponse {
  ResultSet?: { Course?: CourseData[] };
}

async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  const cached = await getCache<T>(cacheKey);
  if (cached) return cached;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Ekispert API error");
  const data = (await res.json()) as T;
  await setCache(cacheKey, data);
  return data;
}

export async function getStationCode(name: string): Promise<string | null> {
  if (!API_KEY) return null;
  const url = `${API_BASE}/station/code?${new URLSearchParams({ key: API_KEY, name })}`;
  const data = await fetchWithCache<StationCodeResponse>(url, `station:${name}`);
  const point = data.ResultSet?.Point;
  if (!point) return null;
  if (Array.isArray(point)) {
    return point[0]?.Station?.code ?? null;
  }
  return point.Station?.code ?? null;
}

export async function getCourse(
  from: string,
  to: string,
  priority: Priority = "optimal",
  passIds: string[] = [],
): Promise<CourseInfo> {
  if (!API_KEY) return { fare: 0, time: 0, distance: 0 };
  const params = new URLSearchParams({ key: API_KEY, from, to, limit: "1" });
  if (priority === "time") params.set("sort", "time");
  else if (priority === "cost") params.set("sort", "price");
  if (passIds.length) params.set("passList", passIds.join(","));
  const url = `${API_BASE}/search/course/extreme?${params.toString()}`;
  const json = await fetchWithCache<CourseResponse>(
    url,
    `course:${from}:${to}:${priority}:${passIds.join(",")}`,
  );
  const course: CourseData = json.ResultSet?.Course?.[0] ?? {};
  const priceArr: CoursePrice[] = Array.isArray(course.Price)
    ? course.Price
    : course.Price
      ? [course.Price]
      : [];
  const fareObj = priceArr.find(
    (p) =>
      p.Kind === "Fare" ||
      p.kind === "Fare" ||
      p.type === "Fare" ||
      p.Name === "Fare",
  );
  const fare = Number(
    fareObj?.Oneway ?? fareObj?.OneWay ?? fareObj?.Fare ?? fareObj?.value ?? 0,
  );
  const time = Number(course.TimeOnBoard ?? 0) + Number(course.TimeOther ?? 0);
  const distance = Number(course.Distance ?? 0);
  return { fare, time, distance };
}

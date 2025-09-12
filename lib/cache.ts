const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function request(method: string, path: string, body?: string) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  const res = await fetch(`${UPSTASH_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await request("GET", `/get/${encodeURIComponent(key)}`);
  if (!data || data.result === null) return null;
  try {
    return JSON.parse(data.result as string) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T): Promise<void> {
  await request(
    "POST",
    `/setex/${encodeURIComponent(key)}/${TTL_SECONDS}`,
    JSON.stringify(value),
  );
}

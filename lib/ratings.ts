import { createServerClient } from '@/lib/supabase/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export type RatingRecord = {
  id: string;
  tripId: string;
  userId: string;
  stars: number; // 1..5
  comment?: string | null;
  isPublic: boolean;
  createdAt: string;
};

async function ensureRatingsTable(): Promise<void> { /* Supabase側でDDL管理 */ }

function generateId(): string {
  const g = (globalThis as any).crypto as any;
  if (g?.randomUUID) return g.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function createRating(params: {
  tripId: string;
  userId: string;
  stars: number;
  comment?: string;
  isPublic?: boolean;
}): Promise<RatingRecord> {
  await ensureRatingsTable();
  const stars = Math.max(1, Math.min(5, Math.floor(params.stars)));
  const id = generateId();
  try {
    const supabase = await createServerClient();
    const { error: insertError } = await supabase
      .from('Rating')
      .insert({
        id,
        tripId: params.tripId,
        userId: params.userId,
        stars,
        comment: params.comment ?? null,
        isPublic: Boolean(params.isPublic ?? false),
      });
    if (insertError) throw insertError;
    const { data: rows, error } = await supabase
      .from('Rating')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw error;
    const row = rows?.[0];
    return normalize(row);
  } catch {
    const rec: RatingRecord = {
      id,
      tripId: params.tripId,
      userId: params.userId,
      stars,
      comment: params.comment ?? null,
      isPublic: Boolean(params.isPublic ?? false),
      createdAt: new Date().toISOString(),
    };
    const all = await readRatingsFromFile();
    all.unshift(rec);
    await writeRatingsToFile(all);
    return rec;
  }
}

export async function listPublicRatings(): Promise<RatingRecord[]> {
  try {
    await ensureRatingsTable();
    const supabase = await createServerClient();
    const { data: rows, error } = await supabase
      .from('Rating')
      .select('*')
      .eq('isPublic', true)
      .order('createdAt', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (rows ?? []).map(normalize);
  } catch {
    const all = await readRatingsFromFile();
    return all.filter(r => r.isPublic).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  }
}

export async function listRatingsByTrip(tripId: string): Promise<RatingRecord[]> {
  try {
    await ensureRatingsTable();
    const supabase = await createServerClient();
    const { data: rows, error } = await supabase
      .from('Rating')
      .select('*')
      .eq('tripId', tripId)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return (rows ?? []).map(normalize);
  } catch {
    const all = await readRatingsFromFile();
    return all.filter(r => r.tripId === tripId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

// 最新の自己評価をトリップごとに1件ずつ返す
export async function listLatestRatingsForTripsByUser(tripIds: string[], userId: string): Promise<Record<string, RatingRecord>> {
  try {
    await ensureRatingsTable();
    if (!Array.isArray(tripIds) || tripIds.length === 0) return {};
    const supabase = await createServerClient();
    const { data: rows, error } = await supabase
      .from('Rating')
      .select('*')
      .eq('userId', userId)
      .in('tripId', tripIds)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    const map: Record<string, RatingRecord> = {};
    for (const row of rows ?? []) {
      const rec = normalize(row);
      if (!map[rec.tripId]) map[rec.tripId] = rec; // 最初（=最新）だけ
    }
    return map;
  } catch {
    // DB未接続などの環境では評価なしとして扱う
    return {};
  }
}

function normalize(row: any): RatingRecord {
  return {
    id: String(row.id),
    tripId: String(row.tripId ?? row.trip_id),
    userId: String(row.userId ?? row.user_id),
    stars: Number(row.stars),
    comment: row.comment ?? null,
    isPublic: Boolean(row.isPublic ?? row.is_public ?? row.ispublic),
    createdAt: new Date(row.createdAt ?? row.created_at).toISOString(),
  };
}


// ---- File fallback ----
async function ratingsFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'ratings.json');
}

async function readRatingsFromFile(): Promise<RatingRecord[]> {
  try {
    const fp = await ratingsFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr as RatingRecord[];
    return [];
  } catch {
    return [];
  }
}

async function writeRatingsToFile(list: RatingRecord[]): Promise<void> {
  const fp = await ratingsFilePath();
  await fs.writeFile(fp, JSON.stringify(list, null, 2), 'utf-8');
}


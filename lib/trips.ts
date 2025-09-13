import { createServerClient } from '@/lib/supabase/server';
import fs from 'node:fs/promises';
import path from 'node:path';

// 生SQLでサクッと存在確認&作成（マイグレーションなしで動かすフォールバック）
async function ensureTripsTable(): Promise<void> { /* Supabase側でDDL管理 */ }

export type TripRecord = {
  id: string;
  userId: string;
  title: string;
  note?: string | null;
  selection: any;
  route: any;
  createdAt: string;
  updatedAt: string;
};

export async function saveTrip(params: {
  userId: string;
  title: string;
  note?: string;
  selection: any;
  route: any;
}): Promise<TripRecord> {
  const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() :
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  try {
    await ensureTripsTable();
    const supabase = createServerClient();
    const { error: insertError } = await supabase
      .from('Trip')
      .insert({
        id,
        userId: params.userId,
        title: params.title,
        note: params.note ?? null,
        selection: params.selection,
        route: params.route,
      });
    if (insertError) throw insertError;
    const { data: rows, error } = await supabase
      .from('Trip')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw error;
    const row = rows?.[0];
    return normalizeTripRow(row);
  } catch {
    const rec: TripRecord = {
      id,
      userId: params.userId,
      title: params.title,
      note: params.note ?? null,
      selection: params.selection,
      route: params.route,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTripToFile(rec);
    return rec;
  }
}

export async function listTripsByUser(userId: string): Promise<TripRecord[]> {
  try {
    await ensureTripsTable();
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from('Trip')
      .select('*')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false });
    if (error) throw error;
    return (rows ?? []).map(normalizeTripRow);
  } catch {
    const all = await readTripsFromFile();
    return all.filter(t => t.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export async function getTripById(id: string, userId: string): Promise<TripRecord | null> {
  try {
    await ensureTripsTable();
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from('Trip')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .limit(1);
    if (error) throw error;
    const row = rows?.[0];
    if (!row) return null;
    return normalizeTripRow(row);
  } catch {
    const all = await readTripsFromFile();
    return all.find(t => t.id === id && t.userId === userId) ?? null;
  }
}

function normalizeTripRow(row: any): TripRecord {
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id ?? row.user_id),
    title: String(row.title),
    note: row.note ?? null,
    selection: row.selection,
    route: row.route,
    createdAt: new Date(row.createdAt ?? row.created_at).toISOString(),
    updatedAt: new Date(row.updatedAt ?? row.updated_at).toISOString(),
  };
}

// ---- File fallback ----
async function dataFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'trips.json');
}

async function readTripsFromFile(): Promise<TripRecord[]> {
  try {
    const fp = await dataFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr as TripRecord[];
    return [];
  } catch {
    return [];
  }
}

async function writeTripsToFile(trips: TripRecord[]): Promise<void> {
  const fp = await dataFilePath();
  await fs.writeFile(fp, JSON.stringify(trips, null, 2), 'utf-8');
}

async function saveTripToFile(trip: TripRecord): Promise<void> {
  const all = await readTripsFromFile();
  const idx = all.findIndex(t => t.id === trip.id);
  if (idx >= 0) all[idx] = trip; else all.unshift(trip);
  await writeTripsToFile(all);
}



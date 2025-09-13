import { createServerClient } from '@/lib/supabase/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body?: string | null;
  createdAt: string;
};

async function ensureNotificationsTable(): Promise<void> { /* Supabase側でDDL管理 */ }

function generateId(): string {
  const g = (globalThis as any).crypto as any;
  if (g?.randomUUID) return g.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
}): Promise<NotificationRecord> {
  const id = generateId();
  try {
    await ensureNotificationsTable();
    const supabase = createServerClient();
    const { error: insertError } = await supabase
      .from('Notification')
      .insert({ id, userId: params.userId, title: params.title, body: params.body ?? null });
    if (insertError) throw insertError;
    const { data: rows, error } = await supabase
      .from('Notification')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw error;
    const row = rows?.[0];
    return normalize(row);
  } catch {
    const rec: NotificationRecord = {
      id,
      userId: params.userId,
      title: params.title,
      body: params.body ?? null,
      createdAt: new Date().toISOString(),
    };
    await saveNotificationToFile(rec);
    return rec;
  }
}

export async function listNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
  try {
    await ensureNotificationsTable();
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from('Notification')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (rows ?? []).map(normalize);
  } catch {
    const all = await readNotificationsFromFile();
    return all
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }
}

function normalize(row: any): NotificationRecord {
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id),
    title: String(row.title),
    body: row.body ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at).toISOString(),
  };
}


// ---- File fallback ----
async function dataFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'notifications.json');
}

async function readNotificationsFromFile(): Promise<NotificationRecord[]> {
  try {
    const fp = await dataFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr as NotificationRecord[];
    return [];
  } catch {
    return [];
  }
}

async function writeNotificationsToFile(notifs: NotificationRecord[]): Promise<void> {
  const fp = await dataFilePath();
  await fs.writeFile(fp, JSON.stringify(notifs, null, 2), 'utf-8');
}

async function saveNotificationToFile(rec: NotificationRecord): Promise<void> {
  const all = await readNotificationsFromFile();
  all.unshift(rec);
  await writeNotificationsToFile(all);
}



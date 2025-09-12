import { prisma } from '@/lib/prisma';
import fs from 'node:fs/promises';
import path from 'node:path';

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body?: string | null;
  createdAt: string;
};

async function ensureNotificationsTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch {
    // noop
  }
}

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
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, "userId", title, body) VALUES ($1, $2, $3, $4)`,
      id,
      params.userId,
      params.title,
      params.body ?? null,
    );
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Notification" WHERE id = $1`, id);
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
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
      userId,
    );
    return rows.map(normalize);
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



import { createServerClient } from '@/lib/supabase/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
  const createdAt = new Date().toISOString();
  // 1) DynamoDB
  const ddb = getDdb();
  if (ddb) {
    try {
      const item = {
        userId: params.userId,
        createdAt,
        id,
        title: params.title,
        body: params.body ?? null,
      };
      await ddb.send(new PutItemCommand({
        TableName: table(),
        Item: marshall(item, { removeUndefinedValues: true }),
      }));
      return { id, userId: params.userId, title: params.title, body: params.body ?? null, createdAt };
    } catch {
      // fallback to Supabase
    }
  }

  // 2) Supabase
  try {
    await ensureNotificationsTable();
    const supabase = await createServerClient();
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
    // 3) File fallback
    const rec: NotificationRecord = { id, userId: params.userId, title: params.title, body: params.body ?? null, createdAt };
    await saveNotificationToFile(rec);
    return rec;
  }
}

export async function listNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
  // 1) DynamoDB
  const ddb = getDdb();
  if (ddb) {
    try {
      const res = await ddb.send(new QueryCommand({
        TableName: table(),
        KeyConditionExpression: '#pk = :uid',
        ExpressionAttributeNames: { '#pk': 'userId' },
        ExpressionAttributeValues: marshall({ ':uid': userId }),
        Limit: 50,
        ScanIndexForward: false,
      }));
      const items = (res.Items ?? []).map((it) => unmarshall(it));
      return items.map((row: any) => normalize(row));
    } catch {
      // fallback to Supabase
    }
  }

  // 2) Supabase
  try {
    await ensureNotificationsTable();
    const supabase = await createServerClient();
    const { data: rows, error } = await supabase
      .from('Notification')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (rows ?? []).map(normalize);
  } catch {
    // 3) File fallback
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

// ---- DDB utils ----
function getDdb(): DynamoDBClient | null {
  try {
    if (process.env.AWS_REGION && process.env.NOTIFICATIONS_TABLE) {
      return new DynamoDBClient({});
    }
    return null;
  } catch {
    return null;
  }
}

const table = () => process.env.NOTIFICATIONS_TABLE as string;



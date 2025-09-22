import { createServerClient } from '@/lib/supabase/server';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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

function selectionSignature(selection: any): string {
  try {
    const originId = String(selection?.origin?.id ?? '');
    const destId = String(selection?.destination?.id ?? '');
    const viaIds = Array.isArray(selection?.vias) ? selection.vias.map((v: any) => String(v?.id ?? '')) : [];
    // passIds があれば含める（順序も含める）
    const passIds = Array.isArray(selection?.passIds) ? selection.passIds.map((p: any) => String(p)) : [];
    return JSON.stringify({ o: originId, d: destId, v: viaIds, p: passIds });
  } catch {
    return '';
  }
}

async function updateTrip(params: {
  id: string;
  title?: string;
  note?: string | null;
  selection?: any;
  route?: any;
}): Promise<TripRecord> {
  await ensureTripsTable();
  const supabase = await createServerClient();
  const updates: any = { updatedAt: new Date().toISOString() };
  if (typeof params.title !== 'undefined') updates.title = params.title;
  if (typeof params.note !== 'undefined') updates.note = params.note;
  if (typeof params.selection !== 'undefined') updates.selection = params.selection;
  if (typeof params.route !== 'undefined') updates.route = params.route;
  const { error: updateError } = await supabase
    .from('Trip')
    .update(updates)
    .eq('id', params.id);
  if (updateError) throw updateError;
  const { data: rows, error } = await supabase
    .from('Trip')
    .select('*')
    .eq('id', params.id)
    .limit(1);
  if (error) throw error;
  const row = rows?.[0];
  return normalizeTripRow(row);
}

export async function saveTrip(params: {
  userId: string;
  title: string;
  note?: string;
  selection: any;
  route: any;
}): Promise<TripRecord> {
  const ddb = getTripsDdb();
  if (ddb) {
    try {
      const now = new Date().toISOString();
      const existing = await listTripsByUser(params.userId);
      const targetSig = selectionSignature(params.selection);
      const dup = existing.find(t => selectionSignature(t.selection) === targetSig);
      if (dup) {
        const item = {
          id: dup.id,
          userId: params.userId,
          title: params.title,
          note: params.note ?? null,
          selection: params.selection,
          route: params.route,
          createdAt: dup.createdAt,
          updatedAt: now,
        };
        await ddb.send(new PutItemCommand({
          TableName: tripsTable(),
          Item: marshall(item, { removeUndefinedValues: true }),
        }));
        return item as TripRecord;
      }
      const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() :
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const item = {
        id,
        userId: params.userId,
        title: params.title,
        note: params.note ?? null,
        selection: params.selection,
        route: params.route,
        createdAt: now,
        updatedAt: now,
      };
      await ddb.send(new PutItemCommand({
        TableName: tripsTable(),
        Item: marshall(item, { removeUndefinedValues: true }),
      }));
      return item as TripRecord;
    } catch {
      // fallback to Supabase below
    }
  }
  // Supabase fallback
  // 既存の同一 selection を検索し、あれば更新
  const existing = await listTripsByUser(params.userId);
  const targetSig = selectionSignature(params.selection);
  const dup = existing.find(t => selectionSignature(t.selection) === targetSig);
  if (dup) {
    return await updateTrip({ id: dup.id, title: params.title, note: params.note ?? null, selection: params.selection, route: params.route });
  }
  const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() :
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  await ensureTripsTable();
  const supabase = await createServerClient();
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from('Trip')
    .insert({
      id,
      userId: params.userId,
      title: params.title,
      note: params.note ?? null,
      selection: params.selection,
      route: params.route,
      createdAt: now,
      updatedAt: now,
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
}

export async function listTripsByUser(userId: string): Promise<TripRecord[]> {
  const ddb = getTripsDdb();
  if (ddb) {
    try {
      const res = await ddb.send(new QueryCommand({
        TableName: tripsTable(),
        KeyConditionExpression: '#pk = :uid',
        ExpressionAttributeNames: { '#pk': 'userId' },
        ExpressionAttributeValues: marshall({ ':uid': userId }),
        ScanIndexForward: false,
        Limit: 100,
      }));
      const items = (res.Items ?? []).map((it) => unmarshall(it));
      const out = items.map((row: any) => normalizeTripRow(row));
      return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      // fallback to Supabase below
    }
  }
  await ensureTripsTable();
  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('Trip')
    .select('*')
    .eq('userId', userId)
    .order('updatedAt', { ascending: false });
  if (error) throw error;
  return (rows ?? []).map(normalizeTripRow);
}

export async function getTripById(id: string, userId: string): Promise<TripRecord | null> {
  const ddb = getTripsDdb();
  if (ddb) {
    try {
      const all = await listTripsByUser(userId);
      const hit = all.find(t => t.id === id) || null;
      return hit;
    } catch {
      // fallback to Supabase below
    }
  }
  await ensureTripsTable();
  const supabase = await createServerClient();
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
}

function normalizeTripRow(row: any): TripRecord {
  const createdRaw = row?.createdAt ?? row?.created_at;
  const updatedRaw = row?.updatedAt ?? row?.updated_at;
  const createdAt = createdRaw ? new Date(createdRaw).toISOString() : new Date().toISOString();
  const updatedAt = updatedRaw ? new Date(updatedRaw).toISOString() : createdAt;
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id),
    title: String(row.title ?? ''),
    note: row.note ?? null,
    selection: row.selection,
    route: row.route,
    createdAt,
    updatedAt,
  };
}

function getTripsDdb(): DynamoDBClient | null {
  try {
    if (process.env.TRIPS_REGION && process.env.TRIPS_TABLE) {
      return new DynamoDBClient({ region: process.env.TRIPS_REGION });
    }
    return null;
  } catch {
    return null;
  }
}

const tripsTable = () => process.env.TRIPS_TABLE as string;


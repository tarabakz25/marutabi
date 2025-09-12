import { prisma } from '@/lib/prisma';

// 生SQLでサクッと存在確認&作成（マイグレーションなしで動かすフォールバック）
async function ensureTripsTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Trip" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL,
        note TEXT,
        selection JSONB NOT NULL,
        route JSONB NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // updatedAt の自動更新トリガ（存在しない環境では無視）
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trip_updated_at') THEN
          CREATE OR REPLACE FUNCTION set_trip_updated_at() RETURNS trigger AS $$
          BEGIN
            NEW."updatedAt" = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          CREATE TRIGGER trg_trip_updated_at
          BEFORE UPDATE ON "Trip"
          FOR EACH ROW EXECUTE PROCEDURE set_trip_updated_at();
        END IF;
      END $$;
    `);
  } catch {
    // テーブル作成に失敗しても以降の処理で再度失敗するため握りつぶし
  }
}

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
  await ensureTripsTable();
  const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() :
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Trip" (id, "userId", title, note, selection, route) VALUES ($1, $2, $3, $4, $5, $6)`,
    id,
    params.userId,
    params.title,
    params.note ?? null,
    params.selection,
    params.route,
  );
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Trip" WHERE id = $1`, id);
  const row = rows?.[0];
  return normalizeTripRow(row);
}

export async function listTripsByUser(userId: string): Promise<TripRecord[]> {
  await ensureTripsTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Trip" WHERE "userId" = $1 ORDER BY "updatedAt" DESC`, userId);
  return rows.map(normalizeTripRow);
}

export async function getTripById(id: string, userId: string): Promise<TripRecord | null> {
  await ensureTripsTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Trip" WHERE id = $1 AND "userId" = $2 LIMIT 1`, id, userId);
  const row = rows?.[0];
  if (!row) return null;
  return normalizeTripRow(row);
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



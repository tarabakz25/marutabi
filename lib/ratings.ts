import { prisma } from '@/lib/prisma';

export type RatingRecord = {
  id: string;
  tripId: string;
  userId: string;
  stars: number; // 1..5
  comment?: string | null;
  isPublic: boolean;
  createdAt: string;
};

async function ensureRatingsTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Rating" (
        id TEXT PRIMARY KEY,
        "tripId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        stars INT NOT NULL,
        comment TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS rating_trip_idx ON "Rating" ("tripId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS rating_public_idx ON "Rating" ("isPublic", "createdAt");
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
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Rating" (id, "tripId", "userId", stars, comment, "isPublic") VALUES ($1, $2, $3, $4, $5, $6)`,
    id,
    params.tripId,
    params.userId,
    stars,
    params.comment ?? null,
    Boolean(params.isPublic ?? false),
  );
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Rating" WHERE id = $1`, id);
  const row = rows?.[0];
  return normalize(row);
}

export async function listPublicRatings(): Promise<RatingRecord[]> {
  await ensureRatingsTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Rating" WHERE "isPublic" = TRUE ORDER BY "createdAt" DESC LIMIT 100`
  );
  return rows.map(normalize);
}

export async function listRatingsByTrip(tripId: string): Promise<RatingRecord[]> {
  await ensureRatingsTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Rating" WHERE "tripId" = $1 ORDER BY "createdAt" DESC`,
    tripId,
  );
  return rows.map(normalize);
}

// 最新の自己評価をトリップごとに1件ずつ返す
export async function listLatestRatingsForTripsByUser(tripIds: string[], userId: string): Promise<Record<string, RatingRecord>> {
  try {
    await ensureRatingsTable();
    if (!Array.isArray(tripIds) || tripIds.length === 0) return {};
    const placeholders = tripIds.map((_, i) => `$${i + 2}`).join(',');
    const sql = `
      SELECT DISTINCT ON ("tripId") *
      FROM "Rating"
      WHERE "userId" = $1 AND "tripId" IN (${placeholders})
      ORDER BY "tripId", "createdAt" DESC
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, userId, ...tripIds);
    const map: Record<string, RatingRecord> = {};
    for (const row of rows) {
      const rec = normalize(row);
      map[rec.tripId] = rec;
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



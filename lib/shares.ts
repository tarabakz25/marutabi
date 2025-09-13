import { prisma } from '@/lib/prisma';
import fs from 'node:fs/promises';
import path from 'node:path';

export type ShareRecord = {
  id: string;
  token: string; // public token for /r/[token]
  tripId: string;
  adminUserId: string; // creator is admin
  createdAt: string;
};

export type TeamMemberRecord = {
  id: string;
  shareId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
};

async function ensureShareTables(): Promise<void> {
  if (!prisma) return; // file fallback only
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Share" (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        "tripId" TEXT NOT NULL,
        "adminUserId" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TeamMember" (
        id TEXT PRIMARY KEY,
        "shareId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        role TEXT NOT NULL,
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS team_unique ON "TeamMember" ("shareId", "userId");
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

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export async function createShare(tripId: string, adminUserId: string): Promise<ShareRecord> {
  await ensureShareTables();
  const id = generateId();
  const token = generateToken();
  if (prisma) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Share" (id, token, "tripId", "adminUserId") VALUES ($1, $2, $3, $4)`,
      id,
      token,
      tripId,
      adminUserId,
    );
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Share" WHERE id = $1`, id);
    const row = rows?.[0];
    return normalizeShare(row);
  }
  const all = await readSharesFromFile();
  const rec: ShareRecord = { id, token, tripId, adminUserId, createdAt: new Date().toISOString() };
  all.shares.unshift(rec);
  await writeSharesToFile(all);
  return rec;
}

export async function getShareByToken(token: string): Promise<ShareRecord | null> {
  await ensureShareTables();
  if (prisma) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Share" WHERE token = $1 LIMIT 1`, token);
    const row = rows?.[0];
    return row ? normalizeShare(row) : null;
  }
  const all = await readSharesFromFile();
  return all.shares.find(s => s.token === token) ?? null;
}

export async function addTeamMember(shareId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<TeamMemberRecord> {
  await ensureShareTables();
  if (prisma) {
    const id = generateId();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TeamMember" (id, "shareId", "userId", role) VALUES ($1, $2, $3, $4)
       ON CONFLICT ("shareId", "userId") DO UPDATE SET role = EXCLUDED.role`,
      id,
      shareId,
      userId,
      role,
    );
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TeamMember" WHERE "shareId" = $1 AND "userId" = $2`, shareId, userId);
    const row = rows?.[0];
    return normalizeMember(row);
  }
  const all = await readSharesFromFile();
  const existing = all.members.find(m => m.shareId === shareId && m.userId === userId);
  if (existing) {
    existing.role = role;
    await writeSharesToFile(all);
    return existing;
  }
  const rec: TeamMemberRecord = { id: generateId(), shareId, userId, role, joinedAt: new Date().toISOString() };
  all.members.unshift(rec);
  await writeSharesToFile(all);
  return rec;
}

export async function listTeamMembers(shareId: string): Promise<TeamMemberRecord[]> {
  await ensureShareTables();
  if (prisma) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TeamMember" WHERE "shareId" = $1 ORDER BY "joinedAt" DESC`, shareId);
    return rows.map(normalizeMember);
  }
  const all = await readSharesFromFile();
  return all.members.filter(m => m.shareId === shareId).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export async function listSharesByTrip(tripId: string): Promise<ShareRecord[]> {
  await ensureShareTables();
  if (prisma) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Share" WHERE "tripId" = $1 ORDER BY "createdAt" DESC`, tripId);
    return rows.map(normalizeShare);
  }
  const all = await readSharesFromFile();
  return all.shares.filter(s => s.tripId === tripId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listMemberUserIdsByTrip(tripId: string): Promise<string[]> {
  await ensureShareTables();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT DISTINCT t."userId" as user_id
     FROM "Share" s
     JOIN "TeamMember" t ON t."shareId" = s.id
     WHERE s."tripId" = $1`,
    tripId,
  );
  return rows.map(r => String(r.user_id));
}

function normalizeShare(row: any): ShareRecord {
  return {
    id: String(row.id),
    token: String(row.token),
    tripId: String(row.tripId ?? row.trip_id),
    adminUserId: String(row.adminUserId ?? row.admin_user_id),
    createdAt: new Date(row.createdAt ?? row.created_at).toISOString(),
  };
}

function normalizeMember(row: any): TeamMemberRecord {
  return {
    id: String(row.id),
    shareId: String(row.shareId ?? row.share_id),
    userId: String(row.userId ?? row.user_id),
    role: (String(row.role) as 'admin' | 'member'),
    joinedAt: new Date(row.joinedAt ?? row.joined_at).toISOString(),
  };
}

// ---- File fallback store ----
type ShareFileStore = { shares: ShareRecord[]; members: TeamMemberRecord[] };
async function sharesFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'shares.json');
}
async function readSharesFromFile(): Promise<ShareFileStore> {
  try {
    const fp = await sharesFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const obj = JSON.parse(txt);
    if (obj && Array.isArray(obj.shares) && Array.isArray(obj.members)) return obj as ShareFileStore;
    return { shares: [], members: [] };
  } catch {
    return { shares: [], members: [] };
  }
}
async function writeSharesToFile(store: ShareFileStore): Promise<void> {
  const fp = await sharesFilePath();
  await fs.writeFile(fp, JSON.stringify(store, null, 2), 'utf-8');
}



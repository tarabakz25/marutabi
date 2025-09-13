import { createServerClient } from '@/lib/supabase/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export type CommentRecord = {
  id: string;
  tripId: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type LikeRecord = {
  id: string;
  tripId: string;
  userId: string;
  createdAt: string;
};

function generateId(): string {
  const g = (globalThis as any).crypto as any;
  if (g?.randomUUID) return g.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ---- Comments ----
export async function createComment(params: { tripId: string; userId: string; body: string }): Promise<CommentRecord> {
  const id = generateId();
  try {
    const supabase = createServerClient();
    const { error: insertError } = await supabase
      .from('Comment')
      .insert({ id, tripId: params.tripId, userId: params.userId, body: params.body });
    if (insertError) throw insertError;
    const { data: rows, error } = await supabase
      .from('Comment')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw error;
    return normalizeComment(rows?.[0]);
  } catch {
    const rec: CommentRecord = { id, tripId: params.tripId, userId: params.userId, body: params.body, createdAt: new Date().toISOString() };
    const all = await readCommentsFromFile();
    all.unshift(rec);
    await writeCommentsToFile(all);
    return rec;
  }
}

export async function listCommentsByTrip(tripId: string): Promise<CommentRecord[]> {
  try {
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from('Comment')
      .select('*')
      .eq('tripId', tripId)
      .order('createdAt', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (rows ?? []).map(normalizeComment);
  } catch {
    const all = await readCommentsFromFile();
    return all.filter(c => c.tripId === tripId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  }
}

// ---- Likes ----
export async function toggleLike(params: { tripId: string; userId: string }): Promise<{ liked: boolean; total: number }> {
  try {
    const supabase = createServerClient();
    // Check existing
    const { data: existing, error: selErr } = await supabase
      .from('Like')
      .select('*')
      .eq('tripId', params.tripId)
      .eq('userId', params.userId)
      .limit(1);
    if (selErr) throw selErr;
    if (existing && existing.length > 0) {
      const { error: delErr } = await supabase
        .from('Like')
        .delete()
        .eq('tripId', params.tripId)
        .eq('userId', params.userId);
      if (delErr) throw delErr;
    } else {
      const id = generateId();
      const { error: insErr } = await supabase
        .from('Like')
        .insert({ id, tripId: params.tripId, userId: params.userId });
      if (insErr) throw insErr;
    }
    const { data: countRows, error: cntErr } = await supabase
      .from('Like')
      .select('id', { count: 'exact', head: true })
      .eq('tripId', params.tripId);
    if (cntErr) throw cntErr;
    const liked = !(existing && existing.length > 0);
    const total = (countRows as any)?.length ?? 0; // SSR count via head may be undefined; fallback
    return { liked, total };
  } catch {
    // file fallback
    const all = await readLikesFromFile();
    const key = `${params.tripId}:${params.userId}`;
    const idx = all.findIndex(l => `${l.tripId}:${l.userId}` === key);
    if (idx >= 0) {
      all.splice(idx, 1);
    } else {
      all.unshift({ id: generateId(), tripId: params.tripId, userId: params.userId, createdAt: new Date().toISOString() });
    }
    await writeLikesToFile(all);
    const total = all.filter(l => l.tripId === params.tripId).length;
    const liked = all.some(l => l.tripId === params.tripId && l.userId === params.userId);
    return { liked, total };
  }
}

export async function getLikeSummary(tripId: string, userId?: string): Promise<{ total: number; likedByMe: boolean }> {
  try {
    const supabase = createServerClient();
    const { data: countRows, error: cntErr } = await supabase
      .from('Like')
      .select('id', { count: 'exact', head: true })
      .eq('tripId', tripId);
    if (cntErr) throw cntErr;
    let likedByMe = false;
    if (userId) {
      const { data: exists } = await supabase
        .from('Like')
        .select('id')
        .eq('tripId', tripId)
        .eq('userId', userId)
        .limit(1);
      likedByMe = Boolean(exists && exists.length > 0);
    }
    const total = (countRows as any)?.length ?? 0;
    return { total, likedByMe };
  } catch {
    const all = await readLikesFromFile();
    const total = all.filter(l => l.tripId === tripId).length;
    const likedByMe = userId ? all.some(l => l.tripId === tripId && l.userId === userId) : false;
    return { total, likedByMe };
  }
}

function normalizeComment(row: any): CommentRecord {
  return {
    id: String(row.id),
    tripId: String(row.tripId ?? row.trip_id),
    userId: String(row.userId ?? row.user_id),
    body: String(row.body ?? ''),
    createdAt: new Date(row.createdAt ?? row.created_at).toISOString(),
  };
}

// ---- File fallback ----
async function commentsFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'comments.json');
}
async function likesFilePath(): Promise<string> {
  const dir = path.join(process.cwd(), '.data');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return path.join(dir, 'likes.json');
}

async function readCommentsFromFile(): Promise<CommentRecord[]> {
  try {
    const fp = await commentsFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr as CommentRecord[];
    return [];
  } catch {
    return [];
  }
}
async function writeCommentsToFile(list: CommentRecord[]): Promise<void> {
  const fp = await commentsFilePath();
  await fs.writeFile(fp, JSON.stringify(list, null, 2), 'utf-8');
}

async function readLikesFromFile(): Promise<LikeRecord[]> {
  try {
    const fp = await likesFilePath();
    const txt = await fs.readFile(fp, 'utf-8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr as LikeRecord[];
    return [];
  } catch {
    return [];
  }
}
async function writeLikesToFile(list: LikeRecord[]): Promise<void> {
  const fp = await likesFilePath();
  await fs.writeFile(fp, JSON.stringify(list, null, 2), 'utf-8');
}



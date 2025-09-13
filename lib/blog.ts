import { createServerClient } from '@/lib/supabase/server';

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
  const supabase = await createServerClient();
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
}

export async function listCommentsByTrip(tripId: string): Promise<CommentRecord[]> {
  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('Comment')
    .select('*')
    .eq('tripId', tripId)
    .order('createdAt', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (rows ?? []).map(normalizeComment);
}

// ---- Likes ----
export async function toggleLike(params: { tripId: string; userId: string }): Promise<{ liked: boolean; total: number }> {
  const supabase = await createServerClient();
  // Check existing
  const { data: existing, error: selErr } = await supabase
    .from('Like')
    .select('id')
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
  const { count, error: cntErr } = await supabase
    .from('Like')
    .select('id', { count: 'exact', head: true })
    .eq('tripId', params.tripId);
  if (cntErr) throw cntErr;
  const liked = !(existing && existing.length > 0);
  const total = typeof count === 'number' ? count : 0;
  return { liked, total };
}

export async function getLikeSummary(tripId: string, userId?: string): Promise<{ total: number; likedByMe: boolean }> {
  const supabase = await createServerClient();
  const { count, error: cntErr } = await supabase
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
  const total = typeof count === 'number' ? count : 0;
  return { total, likedByMe };
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


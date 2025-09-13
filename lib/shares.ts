import { createServerClient } from '@/lib/supabase/server';

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

function generateId(): string {
  const g = (globalThis as any).crypto as any;
  if (g?.randomUUID) return g.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export async function createShare(tripId: string, adminUserId: string): Promise<ShareRecord> {
  const id = generateId();
  const token = generateToken();
  const supabase = await createServerClient();
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from('Share')
    .insert({ id, token, tripId, adminUserId, createdAt: now });
  if (insertError) throw insertError;
  const { data: rows, error } = await supabase
    .from('Share')
    .select('*')
    .eq('id', id)
    .limit(1);
  if (error) throw error;
  const row = rows?.[0];
  return normalizeShare(row);
}

export async function getShareByToken(token: string): Promise<ShareRecord | null> {
  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('Share')
    .select('*')
    .eq('token', token)
    .limit(1);
  if (error) throw error;
  const row = rows?.[0];
  return row ? normalizeShare(row) : null;
}

export async function addTeamMember(shareId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<TeamMemberRecord> {
  const supabase = await createServerClient();
  // upsert by unique (shareId,userId)
  const { data: existing } = await supabase
    .from('TeamMember')
    .select('*')
    .eq('shareId', shareId)
    .eq('userId', userId)
    .limit(1);
  if (existing && existing.length > 0) {
    const { error: updErr } = await supabase
      .from('TeamMember')
      .update({ role })
      .eq('shareId', shareId)
      .eq('userId', userId);
    if (updErr) throw updErr;
  } else {
    const id = generateId();
    const { error: insErr } = await supabase
      .from('TeamMember')
      .insert({ id, shareId, userId, role });
    if (insErr) throw insErr;
  }
  const { data: rows, error } = await supabase
    .from('TeamMember')
    .select('*')
    .eq('shareId', shareId)
    .eq('userId', userId)
    .limit(1);
  if (error) throw error;
  const row = rows?.[0];
  return normalizeMember(row);
}

export async function listTeamMembers(shareId: string): Promise<TeamMemberRecord[]> {
  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('TeamMember')
    .select('*')
    .eq('shareId', shareId)
    .order('joinedAt', { ascending: false });
  if (error) throw error;
  return (rows ?? []).map(normalizeMember);
}

export async function listSharesByTrip(tripId: string): Promise<ShareRecord[]> {
  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('Share')
    .select('*')
    .eq('tripId', tripId)
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return (rows ?? []).map(normalizeShare);
}

export async function listMemberUserIdsByTrip(tripId: string): Promise<string[]> {
  const supabase = await createServerClient();
  // 1) get shares for the trip
  const { data: shares, error: shareErr } = await supabase
    .from('Share')
    .select('id')
    .eq('tripId', tripId);
  if (shareErr) throw shareErr;
  const shareIds = (shares ?? []).map(s => String((s as any).id));
  if (shareIds.length === 0) return [];
  // 2) members for these shares
  const { data: members, error: memErr } = await supabase
    .from('TeamMember')
    .select('userId, shareId')
    .in('shareId', shareIds);
  if (memErr) throw memErr;
  const set = new Set<string>();
  for (const m of members ?? []) set.add(String((m as any).userId));
  return Array.from(set);
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

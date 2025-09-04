import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withUser } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const uid = (session?.user as any)?.sub ?? null;
  const rows = await withUser(uid, async (uid: string, db: Pool) => (
    await db.query('select id, title from trips order by created_at desc limit 50')).rows
  );
  return Response.json(rows);
}
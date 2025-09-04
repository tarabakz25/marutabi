import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL!,
  ssl: {
    rejectUnauthorized: false,
  }
});

export async function withUser(userId: string | null, f: (c: any) => Promise<any>) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (userId) await client.query('set local app.user_id = $1', [userId]);
    const out = await f(client);
    return out;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}
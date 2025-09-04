import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getSession() {
  return await getServerSession(authOptions as any);
}

export async function withUser(handler: any) {
  return async (req: any, res: any) => {
    const session = await getSession();
    if (!session?.user?.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handler(req, res, session);
  };
}
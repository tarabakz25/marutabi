import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import MarketingPage from './marketing/page';
import { authOptions } from '@/lib/authOptions';

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect('/dashboard');
  }
  return <MarketingPage />;
}

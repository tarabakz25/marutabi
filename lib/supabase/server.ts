import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = cookies() as any;
  
  return createSupabaseServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          return cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options) as any
          ) as any;
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options) as any
          ) as any;
        }
      }
    }
  )
}
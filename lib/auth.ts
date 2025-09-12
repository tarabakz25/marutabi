import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function requireUser() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user) throw new Error("Unauthorized");
  const userAny = session.user as any;
  const userId = (userAny.id ?? userAny.sub) as string | undefined;
  if (!userId) throw new Error("Unauthorized");
  return { userId };
}


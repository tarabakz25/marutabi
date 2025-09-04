import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function requireUser() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user) throw new Error("Unauthorized");
  return { userId: (session.user as any).sub as string };
}


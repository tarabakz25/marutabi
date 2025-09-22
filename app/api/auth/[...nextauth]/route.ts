import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);

export async function GET(req: Request, ctx: any) {
  try {
    return await (handler as any)(req, ctx);
  } catch (e) {
    try {
      const url = new URL(req.url);
      if (url.pathname.endsWith("/session")) {
        const body = JSON.stringify({ user: null, expires: new Date(Date.now() + 24 * 3600 * 1000).toISOString() });
        return new Response(body, { headers: { "content-type": "application/json" } });
      }
    } catch {}
    console.error("NextAuth GET error", e);
    return new Response("Auth error", { status: 500 });
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    return await (handler as any)(req, ctx);
  } catch (e) {
    try {
      const url = new URL(req.url);
      if (url.pathname.endsWith("/_log") || url.pathname.endsWith("/session")) {
        const body = JSON.stringify({ ok: true });
        return new Response(body, { headers: { "content-type": "application/json" } });
      }
    } catch {}
    console.error("NextAuth POST error", e);
    return new Response("Auth error", { status: 500 });
  }
}
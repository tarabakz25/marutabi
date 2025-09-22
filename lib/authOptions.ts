import type { NextAuthOptions } from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Google from "next-auth/providers/google";
import { createHash } from "node:crypto";

const providers = [] as any[];

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

// Cognito
if (process.env.COGNITO_CLIENT_ID && process.env.COGNITO_CLIENT_SECRET && process.env.COGNITO_ISSUER) {
  providers.push(
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: (() => {
    if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
    const issuer = process.env.COGNITO_ISSUER || process.env.GOOGLE_CLIENT_ID || process.env.NEXTAUTH_URL || "";
    const seed = `${issuer}:${process.env.COGNITO_CLIENT_ID ?? ""}`;
    if (seed.trim().length > 0) {
      return createHash("sha256").update(seed).digest("hex");
    }
    return "fallback-secret"; // 最終手段（本番ではENV設定推奨）
  })(),
  providers,
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = (token as any).sub;
        (session.user as any).image = (token as any).picture ?? session.user.image;
        (session.user as any).name = (token as any).name ?? session.user.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};



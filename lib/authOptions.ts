import type { NextAuthOptions } from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Google from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // Google 直接認証（Cognito連携ではなく単独で利用したい場合のみ有効化）
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // Cognito (Google フェデレーションをCognito側で構成している前提)
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
    }),
  ],
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



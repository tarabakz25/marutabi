import type { NextAuthOptions } from "next-auth";
import Github from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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



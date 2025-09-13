import { PrismaClient } from "@prisma/client";

declare global {
  // var を使うグローバル宣言は Next.js ドキュメントでも推奨されるため許容
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | null | undefined;
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

export const prisma: PrismaClient | null = hasDatabaseUrl
  ? (globalThis.prisma as PrismaClient | null) ?? new PrismaClient()
  : null;

if (process.env.NODE_ENV !== "production" && hasDatabaseUrl) {
  globalThis.prisma = prisma as PrismaClient;
} else if (!hasDatabaseUrl) {
  // 明示的に null をセットして、利用側でフォールバック可能にする
  globalThis.prisma = null;
  if (process.env.NODE_ENV !== "test") {
    console.warn("Prisma is disabled: DATABASE_URL is not set. Falling back to file storage where supported.");
  }
}



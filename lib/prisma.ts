import { PrismaClient } from "./generated/prisma";

declare global {
  // var を使うグローバル宣言は Next.js ドキュメントでも推奨されるため許容
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}



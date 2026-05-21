/**
 * Prisma client singleton.
 *
 * In dev, Next.js HMR can re-evaluate this module many times, which would
 * spawn a new PrismaClient every time and exhaust the SQLite connection
 * pool. Caching it on `globalThis` avoids that.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

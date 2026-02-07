import { PrismaClient } from "@generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client singleton.
 *
 * Reuses a single PrismaClient instance across the application
 * to avoid exhausting database connections during development
 * (Bun --watch restarts the process frequently).
 *
 * In production a fresh instance is created per process start.
 *
 * Prisma 7 requires an explicit driver adapter for all databases.
 * We use @prisma/adapter-pg for PostgreSQL.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

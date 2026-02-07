import { Elysia } from "elysia";
import { prisma } from "./prisma";

/**
 * Elysia plugin that decorates the app with the Prisma client.
 *
 * Usage:
 *   new Elysia().use(databasePlugin).get("/", ({ prisma }) => { ... })
 *
 * Named "database" so Elysia deduplicates it across .use() calls.
 */
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("prisma", prisma)
  .onStop(async () => {
    await prisma.$disconnect();
  });

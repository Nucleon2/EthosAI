import path from "node:path";
import { defineConfig } from "prisma/config";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

// Prisma CLI does not auto-load .env the way `bun run` does,
// so we load it explicitly before reading DATABASE_URL.
try {
  loadEnvFile(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env"),
  );
} catch {
  // .env may not exist in CI or production — that's fine.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

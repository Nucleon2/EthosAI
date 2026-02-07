import { Elysia } from "elysia";
import { createWalletRoutes } from "./modules/wallet";
import { createDiscordRoutes } from "./modules/discord";
import { createSocialRoutes } from "./modules/social";
import { databasePlugin } from "./modules/database";
import { startBot } from "./modules/discord/bot";
import cors from "@elysiajs/cors";
import {
  ALLOW_VERCEL_PREVIEW_ORIGINS,
  CLIENT_URL,
  CLIENT_URLS,
  NODE_ENV,
} from "./constants/env.constants";
import openapi from "@elysiajs/openapi";
import { RateLimiter } from "./utils/rate-limiter";


const PORT = Number(process.env.PORT ?? 3000);

// Allow 10 analysis requests per minute per IP address
const apiRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60_000,
});
const allowedOrigins = new Set([CLIENT_URL, ...CLIENT_URLS]);

function isVercelOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isOriginAllowedValue(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (ALLOW_VERCEL_PREVIEW_ORIGINS && isVercelOrigin(origin)) {
    return true;
  }

  if (NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
    return true;
  }

  console.warn(`[cors] Rejected origin: ${origin}`);
  return false;
}

function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin") ?? undefined;
  return isOriginAllowedValue(origin);
}

new Elysia()
  .use(cors({
    origin: isOriginAllowed,
    methods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }))
  .use(openapi({ enabled: NODE_ENV === "development" }))
  .use(databasePlugin)
  .onError(({ code, error, request, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    const url = new URL(request.url);
    console.error(
      `[server] Unhandled error (${code}) on ${url.pathname}:`,
      error
    );
    set.status = 500;
    return {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  })
  .onBeforeHandle(({ request, set }) => {
    // Only rate-limit wallet analysis endpoints, not health checks
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/address")) {
      return;
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const result = apiRateLimiter.check(ip);

    if (!result.allowed) {
      set.status = 429;
      set.headers["retry-after"] = String(result.retryAfterSeconds);
      return {
        success: false,
        error: "Too many requests. Please try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }

    set.headers["x-ratelimit-remaining"] = String(result.remaining);
    return;
  })
  .get("/api/ping", () => {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      status: "ok"
    };
  })
  .group("/api", (group) =>
    group
      .use(createWalletRoutes())
      .use(createDiscordRoutes())
      .use(createSocialRoutes())
  ).listen({
    port: PORT,
    hostname: "0.0.0.0"
  });

console.log(
  `Derive AI server running at http://localhost:${PORT}`
);
console.log(`Health check: http://localhost:${PORT}/api/ping`);
console.log(`Wallet API: http://localhost:${PORT}/api/address/:walletAddress`);
console.log(`Token API: http://localhost:${PORT}/api/address/:walletAddress/token/:tokenAddress`);
console.log(`Discord API: http://localhost:${PORT}/api/discord/status`);
console.log(`Social API: http://localhost:${PORT}/api/social/generate`);

// Auto-start Discord bot if enabled via environment variable
if (process.env.DISCORD_AUTO_START === "true") {
  startBot()
    .then(() => console.log("Discord bot auto-started"))
    .catch((err) =>
      console.error("Discord bot auto-start failed:", err)
    );
}

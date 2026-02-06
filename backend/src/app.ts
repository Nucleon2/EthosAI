import { Elysia } from "elysia";
import { createWalletRoutes } from "./modules/wallet";

/**
 * Bootstrap the Elysia application
 * 
 * This is the main app instance that registers all routes
 * and middleware for the Ethereum Wallet Market Analysis system.
 */
export function createApp(): Elysia {
  const app = new Elysia();

  // Health check route
  app.get("/api/ping", () => {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      status: "ok"
    };
  });

  // Register wallet routes
  app.group("/api", (group) => group.use(createWalletRoutes()));

  return app;
}

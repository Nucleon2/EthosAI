import { Elysia } from "elysia";

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

  return app;
}

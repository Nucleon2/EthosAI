import { Elysia } from "elysia";
import { createWalletRoutes } from "./modules/wallet";
import { databasePlugin } from "./modules/database";

const PORT = process.env.PORT || 3000;

const app = new Elysia()
  .use(databasePlugin)
  .get("/api/ping", () => {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      status: "ok",
    };
  })
  .group("/api", (group) => group.use(createWalletRoutes()))
  .listen(PORT);

export type App = typeof app;
export { app };

console.log(
  `🚀 Ethereum Wallet Market Analysis server is running at http://localhost:${PORT}`
);
console.log(`📍 Health check: http://localhost:${PORT}/api/ping`);
console.log(`💰 Wallet API: http://localhost:${PORT}/api/address/:walletAddress`);
console.log(`🪙 Token API: http://localhost:${PORT}/api/address/:walletAddress/token/:tokenAddress`);
console.log(`📖 See WALLET_API.md for complete API documentation`);

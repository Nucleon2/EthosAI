import { Elysia } from "elysia";
import { createWalletRoutes } from "./modules/wallet";
import { databasePlugin } from "./modules/database";
import cors from "@elysiajs/cors";
import { CLIENT_URL, NODE_ENV } from "./modules/constants/env.constants";
import openapi from "@elysiajs/openapi";


const PORT = process.env.PORT || 3000;

new Elysia()
  .use(cors({
    origin: [CLIENT_URL],
    methods: ["POST", "GET", "PATCH", "DELETE"]
  }))
  .use(openapi({ enabled: NODE_ENV === "development" }))
  .use(databasePlugin)
  .get("/api/ping", () => {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      status: "ok"
    };
  })
  .group("/api", (group) => group.use(createWalletRoutes())).listen(PORT);

console.log(
  `🚀 Ethereum Wallet Market Analysis server is running at http://localhost:${PORT}`
);
console.log(`📍 Health check: http://localhost:${PORT}/api/ping`);
console.log(`💰 Wallet API: http://localhost:${PORT}/api/address/:walletAddress`);
console.log(`🪙 Token API: http://localhost:${PORT}/api/address/:walletAddress/token/:tokenAddress`);
console.log(`📖 See WALLET_API.md for complete API documentation`);

import { Elysia } from "elysia";
import { createWalletRoutes } from "./modules/wallet";
import { createDiscordRoutes } from "./modules/discord";
import { databasePlugin } from "./modules/database";
import { startBot } from "./modules/discord/bot";
import cors from "@elysiajs/cors";
import { CLIENT_URL, NODE_ENV } from "./constants/env.constants";
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
  .group("/api", (group) =>
    group
      .use(createWalletRoutes())
      .use(createDiscordRoutes())
  ).listen(PORT);

console.log(
  `Derive AI server running at http://localhost:${PORT}`
);
console.log(`Health check: http://localhost:${PORT}/api/ping`);
console.log(`Wallet API: http://localhost:${PORT}/api/address/:walletAddress`);
console.log(`Token API: http://localhost:${PORT}/api/address/:walletAddress/token/:tokenAddress`);
console.log(`Discord API: http://localhost:${PORT}/api/discord/status`);

// Auto-start Discord bot if enabled via environment variable
if (process.env.DISCORD_AUTO_START === "true") {
  startBot()
    .then(() => console.log("Discord bot auto-started"))
    .catch((err) =>
      console.error("Discord bot auto-start failed:", err)
    );
}

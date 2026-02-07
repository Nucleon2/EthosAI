import { Elysia, t } from "elysia";
import { startBot, stopBot, getClient } from "./bot";
import { databaseService } from "../database";
import { sessionManager } from "./session-manager";

/**
 * Elysia routes for the Discord coaching bot module.
 *
 * Provides endpoints to manage the bot lifecycle,
 * query session history, and look up linked users.
 */
export function createDiscordRoutes() {
  return new Elysia({ prefix: "/discord" })
    .post("/start", async ({ set }) => {
      try {
        await startBot();
        return { status: "ok", message: "Discord bot started" };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[discord] Failed to start bot:", error);
        set.status = 500;
        return { status: "error", message };
      }
    })
    .post("/stop", async ({ set }) => {
      try {
        await stopBot();
        return { status: "ok", message: "Discord bot stopped" };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[discord] Failed to stop bot:", error);
        set.status = 500;
        return { status: "error", message };
      }
    })
    .get("/status", () => {
      const client = getClient();
      return {
        online: !!client,
        username: client?.user?.tag ?? null,
        guilds: client?.guilds.cache.size ?? 0,
      };
    })
    /**
     * GET /api/discord/sessions/:walletAddress
     *
     * Returns paginated coaching session history for a wallet.
     */
    .get(
      "/sessions/:walletAddress",
      async ({ params, query, set }) => {
        try {
          const { walletAddress } = params;
          const limit = Math.min(
            parseInt(query.limit || "10", 10),
            50
          );
          const offset = parseInt(query.offset || "0", 10);

          const sessions = await databaseService.getDiscordSessionHistory(
            walletAddress,
            limit,
            offset
          );

          return {
            success: true,
            sessions,
            meta: {
              address: walletAddress,
              count: sessions.length,
              limit,
              offset,
              retrievedAt: new Date().toISOString(),
            },
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error",
            meta: { retrievedAt: new Date().toISOString() },
          };
        }
      },
      {
        params: t.Object({
          walletAddress: t.String({
            description: "Ethereum wallet address (0x...)",
            pattern: "^0x[a-fA-F0-9]{40}$",
          }),
        }),
        query: t.Object({
          limit: t.Optional(
            t.String({
              description: "Number of records (default: 10, max: 50)",
              pattern: "^[0-9]+$",
            })
          ),
          offset: t.Optional(
            t.String({
              description: "Records to skip (default: 0)",
              pattern: "^[0-9]+$",
            })
          ),
        }),
      }
    )
    /**
     * GET /api/discord/sessions/:walletAddress/latest
     *
     * Returns the most recent coaching session for a wallet.
     */
    .get(
      "/sessions/:walletAddress/latest",
      async ({ params, set }) => {
        try {
          const session = await databaseService.getLatestDiscordSession(
            params.walletAddress
          );

          if (!session) {
            set.status = 404;
            return {
              success: false,
              error: "No coaching sessions found for this wallet.",
              meta: { retrievedAt: new Date().toISOString() },
            };
          }

          return {
            success: true,
            session,
            meta: { retrievedAt: new Date().toISOString() },
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error",
            meta: { retrievedAt: new Date().toISOString() },
          };
        }
      },
      {
        params: t.Object({
          walletAddress: t.String({
            description: "Ethereum wallet address (0x...)",
            pattern: "^0x[a-fA-F0-9]{40}$",
          }),
        }),
      }
    )
    /**
     * GET /api/discord/user/:discordUserId
     *
     * Looks up the wallet linked to a Discord user ID.
     * Also reports whether the user has an active coaching session.
     */
    .get(
      "/user/:discordUserId",
      async ({ params, set }) => {
        try {
          const user = await databaseService.findUserByDiscordId(
            params.discordUserId
          );

          if (!user) {
            set.status = 404;
            return {
              success: false,
              error: "No wallet linked to this Discord user.",
              meta: { retrievedAt: new Date().toISOString() },
            };
          }

          const hasActiveSession = sessionManager.hasSession(
            params.discordUserId
          );

          return {
            success: true,
            user: {
              id: user.id,
              walletAddress: user.walletAddress,
              discordUserId: user.discordUserId,
              firstSeenAt: user.firstSeenAt,
              lastActiveAt: user.lastActiveAt,
            },
            hasActiveSession,
            meta: { retrievedAt: new Date().toISOString() },
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error",
            meta: { retrievedAt: new Date().toISOString() },
          };
        }
      },
      {
        params: t.Object({
          discordUserId: t.String({
            description: "Discord user ID (snowflake)",
          }),
        }),
      }
    );
}

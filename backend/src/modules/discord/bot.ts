import {
  Client,
  GatewayIntentBits,
  Events,
  type Interaction,
} from "discord.js";
import { handleCoach } from "./commands/coach";
import { handleStop } from "./commands/stop";
import { handleLink } from "./commands/link";

/**
 * Possible lifecycle states for the Discord bot.
 *
 * - offline:     Not running, no client exists.
 * - connecting:  Login has been initiated but the gateway
 *                handshake has not completed yet.
 * - online:      Client is authenticated and ready.
 * - error:       The most recent login attempt failed.
 */
export type BotStatus = "offline" | "connecting" | "online" | "error";

let client: Client | null = null;
let botStatus: BotStatus = "offline";
let lastError: string | null = null;

/**
 * Creates and configures the Discord.js client with required intents
 * for voice channel access and slash command handling.
 */
function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
}

/**
 * Routes incoming slash command interactions to their handlers.
 */
async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case "coach":
      await handleCoach(interaction);
      break;
    case "stop":
      await handleStop(interaction);
      break;
    case "link":
      await handleLink(interaction);
      break;
    default:
      break;
  }
}

/**
 * Kicks off the Discord bot login in the background.
 *
 * Returns immediately — the actual gateway handshake happens
 * asynchronously. Use {@link getBotStatus} to check progress.
 *
 * Idempotent: calling while already connecting or online is a no-op.
 */
export function requestBotStart(): void {
  if (botStatus === "online" || botStatus === "connecting") {
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    botStatus = "error";
    lastError = "DISCORD_BOT_TOKEN environment variable is not set";
    console.error(`[discord] ${lastError}`);
    return;
  }

  botStatus = "connecting";
  lastError = null;

  const newClient = createClient();

  newClient.on(Events.InteractionCreate, handleInteraction);

  newClient.once(Events.ClientReady, (c) => {
    client = newClient;
    botStatus = "online";
    lastError = null;
    console.log(`[discord] Bot logged in as ${c.user.tag}`);
  });

  newClient.login(token).catch((error) => {
    newClient.removeAllListeners();
    newClient.destroy();
    botStatus = "error";
    lastError =
      error instanceof Error ? error.message : "Unknown login error";
    console.error("[discord] Bot login failed:", error);
  });
}

/**
 * Starts the Discord bot and waits for it to be ready.
 *
 * This is kept for the `DISCORD_AUTO_START` path at server boot,
 * where we want to log success/failure synchronously in the
 * startup sequence. HTTP routes should use {@link requestBotStart}
 * instead.
 */
export async function startBot(): Promise<Client> {
  if (client && botStatus === "online") return client;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }

  botStatus = "connecting";
  lastError = null;

  const newClient = createClient();

  newClient.on(Events.InteractionCreate, handleInteraction);

  return new Promise<Client>((resolve, reject) => {
    newClient.once(Events.ClientReady, (c) => {
      client = newClient;
      botStatus = "online";
      lastError = null;
      console.log(`[discord] Bot logged in as ${c.user.tag}`);
      resolve(newClient);
    });

    newClient.login(token).catch((error) => {
      newClient.removeAllListeners();
      newClient.destroy();
      botStatus = "error";
      lastError =
        error instanceof Error ? error.message : "Unknown login error";
      console.error("[discord] Bot login failed:", error);
      reject(error);
    });
  });
}

/**
 * Gracefully shuts down the Discord bot.
 */
export async function stopBot(): Promise<void> {
  if (!client) {
    botStatus = "offline";
    lastError = null;
    return;
  }
  client.destroy();
  client = null;
  botStatus = "offline";
  lastError = null;
  console.log("[discord] Bot disconnected");
}

/**
 * Returns the active Discord client, or null if not started.
 */
export function getClient(): Client | null {
  return client;
}

/**
 * Returns the current bot lifecycle status and any error message.
 */
export function getBotStatus(): { status: BotStatus; error: string | null } {
  return { status: botStatus, error: lastError };
}

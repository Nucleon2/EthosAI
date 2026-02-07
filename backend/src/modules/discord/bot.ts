import {
  Client,
  GatewayIntentBits,
  Events,
  type Interaction,
} from "discord.js";
import { handleCoach } from "./commands/coach";
import { handleStop } from "./commands/stop";
import { handleLink } from "./commands/link";

let client: Client | null = null;

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
 * Starts the Discord bot — logs in, registers event handlers.
 * Idempotent: calling multiple times returns the existing client.
 */
export async function startBot(): Promise<Client> {
  if (client) return client;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }

  client = createClient();

  client.on(Events.InteractionCreate, handleInteraction);

  client.once(Events.ClientReady, (c) => {
    console.log(`Discord bot logged in as ${c.user.tag}`);
  });

  await client.login(token);
  return client;
}

/**
 * Gracefully shuts down the Discord bot.
 */
export async function stopBot(): Promise<void> {
  if (!client) return;
  client.destroy();
  client = null;
  console.log("Discord bot disconnected");
}

/**
 * Returns the active Discord client, or null if not started.
 */
export function getClient(): Client | null {
  return client;
}

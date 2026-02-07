import { REST, Routes, SlashCommandBuilder } from "discord.js";

/**
 * Defines the three slash commands for the Derive AI coaching bot.
 */
const commands = [
  new SlashCommandBuilder()
    .setName("coach")
    .setDescription(
      "Start a voice coaching session — bot joins your voice channel"
    ),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("End the coaching session and leave the voice channel"),
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Ethereum wallet to your Discord account")
    .addStringOption((opt) =>
      opt
        .setName("wallet_address")
        .setDescription("Your Ethereum wallet address (0x...)")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

/**
 * Registers slash commands with the Discord API.
 * Run this script once: `bun src/modules/discord/commands/deploy.ts`
 */
async function deploy(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error(
      "DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set"
    );
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log("Registering slash commands...");

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands,
  });

  console.log("Slash commands registered successfully");
}

deploy().catch(console.error);

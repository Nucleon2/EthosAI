import { REST, Routes, SlashCommandBuilder } from "discord.js";

/**
 * Defines the slash commands for the Derive AI coaching bot.
 *
 * Run from backend directory: `bun src/modules/discord/commands/deploy.ts`
 * Bun auto-loads .env from the working directory.
 */
const commands = [
  new SlashCommandBuilder()
    .setName("coach")
    .setDescription(
      "Start a voice coaching session -- bot joins your voice channel"
    )
    .addStringOption((opt) =>
      opt
        .setName("token_address")
        .setDescription(
          "Optional: focus on a specific token (0x...)"
        )
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription(
      "End the coaching session and leave the voice channel"
    ),
  new SlashCommandBuilder()
    .setName("link")
    .setDescription(
      "Link your Ethereum wallet to your Discord account"
    )
    .addStringOption((opt) =>
      opt
        .setName("wallet_address")
        .setDescription("Your Ethereum wallet address (0x...)")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

/**
 * Registers slash commands with the Discord API.
 *
 * Requires DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID in .env.
 */
async function deploy(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token) {
    console.error(
      "Missing DISCORD_BOT_TOKEN. Add it to backend/.env"
    );
    process.exit(1);
  }

  if (!clientId) {
    console.error(
      "Missing DISCORD_CLIENT_ID. Add it to backend/.env"
    );
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(
    `Registering ${commands.length} slash commands for client ${clientId}...`
  );

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands,
  });

  console.log("Slash commands registered successfully:");
  for (const cmd of commands) {
    const name = (cmd as { name: string }).name;
    console.log(`  /${name}`);
  }
}

deploy().catch((err) => {
  console.error("Failed to deploy slash commands:", err);
  process.exit(1);
});

import {
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import { databaseService } from "../../database";
import { sessionManager } from "../session-manager";
import { joinChannel } from "../voice/connection-manager";

/**
 * /coach — Joins the user's voice channel and starts
 * a behavioral coaching session powered by their wallet data.
 */
export async function handleCoach(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // Must be in a guild
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: 64,
    });
    return;
  }

  // Check if user already has an active session
  if (sessionManager.hasSession(interaction.user.id)) {
    await interaction.reply({
      content: "You already have an active coaching session. Use `/stop` to end it first.",
      flags: 64,
    });
    return;
  }

  // User must be in a voice channel
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannel = member.voice.channel;

  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: "Join a voice channel first, then run `/coach`.",
      flags: 64,
    });
    return;
  }

  // Check if wallet is linked
  const dbUser = await databaseService.findUserByDiscordId(
    interaction.user.id
  );

  if (!dbUser) {
    await interaction.reply({
      content: "Link your wallet first with `/link <wallet_address>`.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  try {
    // Join the voice channel
    const connection = joinChannel(
      voiceChannel.id,
      interaction.guild.id,
      interaction.guild.voiceAdapterCreator
    );

    // Start the coaching session
    await sessionManager.startSession({
      userId: dbUser.id,
      discordUserId: interaction.user.id,
      walletAddress: dbUser.walletAddress,
      guildId: interaction.guild.id,
      channelId: voiceChannel.id,
      connection,
    });

    await interaction.editReply(
      "Coaching session started. I'm listening — speak whenever you're ready."
    );
  } catch (error) {
    console.error("Failed to start coaching session:", error);
    await interaction.editReply(
      "Failed to start session. Please try again."
    );
  }
}

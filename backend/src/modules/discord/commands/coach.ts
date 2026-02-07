import {
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import { databaseService } from "../../database";
import { sessionManager } from "../session-manager";
import { joinChannel } from "../voice/connection-manager";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * /coach [token_address] -- Joins the user's voice channel and
 * starts a behavioral coaching session powered by their wallet data.
 *
 * Optionally accepts a token address to focus the conversation
 * on a specific token's analysis.
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
      content:
        "You already have an active coaching session. " +
        "Use `/stop` to end it first.",
      flags: 64,
    });
    return;
  }

  // User must be in a voice channel
  const member = await interaction.guild.members.fetch(
    interaction.user.id
  );
  const voiceChannel = member.voice.channel;

  if (
    !voiceChannel ||
    voiceChannel.type !== ChannelType.GuildVoice
  ) {
    await interaction.reply({
      content: "Join a voice channel first, then run `/coach`.",
      flags: 64,
    });
    return;
  }

  // Validate optional token address before deferring
  const tokenAddress =
    interaction.options.getString("token_address");

  if (tokenAddress && !ETH_ADDRESS_RE.test(tokenAddress)) {
    await interaction.reply({
      content:
        "Invalid token address. Must be `0x` followed by " +
        "40 hex characters.",
      flags: 64,
    });
    return;
  }

  // Acknowledge immediately so Discord doesn't time out
  // (DB and voice operations below can be slow)
  await interaction.deferReply({ flags: 64 });

  try {
    // Check if wallet is linked (DB call -- may be slow)
    const dbUser = await databaseService.findUserByDiscordId(
      interaction.user.id
    );

    if (!dbUser) {
      await interaction.editReply(
        "Link your wallet first with `/link <wallet_address>`."
      );
      return;
    }

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
      tokenAddress: tokenAddress ?? undefined,
    });

    const focusMsg = tokenAddress
      ? ` Focusing on token \`${tokenAddress}\`.`
      : "";

    await interaction.editReply(
      "Coaching session started." +
        focusMsg +
        " I'm listening -- speak whenever you're ready."
    );
  } catch (error) {
    console.error("[Coach] Failed to start session:", error);
    await interaction.editReply(
      "Failed to start session. The database may be " +
        "unavailable — please try again later."
    );
  }
}

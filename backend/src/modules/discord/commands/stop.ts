import type { ChatInputCommandInteraction } from "discord.js";
import { sessionManager } from "../session-manager";
import { leaveChannel } from "../voice/connection-manager";

/**
 * /stop — Ends the active coaching session, saves a summary
 * to the database, and leaves the voice channel.
 */
export async function handleStop(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: 64,
    });
    return;
  }

  const session = sessionManager.getSession(interaction.user.id);

  if (!session) {
    await interaction.reply({
      content: "You don't have an active coaching session.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  try {
    // End session (persists to DB)
    await sessionManager.endSession(interaction.user.id);

    // Leave voice channel
    leaveChannel(interaction.guild.id);

    await interaction.editReply(
      "Coaching session ended. Your session summary has been saved."
    );
  } catch (error) {
    console.error("Failed to stop coaching session:", error);
    await interaction.editReply(
      "Failed to end session cleanly. The bot will leave the channel."
    );
    // Force leave even on error
    leaveChannel(interaction.guild.id);
  }
}

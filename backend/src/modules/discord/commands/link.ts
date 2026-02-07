import type { ChatInputCommandInteraction } from "discord.js";
import { databaseService } from "../../database";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * /link <wallet_address> — Associates a Discord user with their
 * Ethereum wallet address in the database.
 */
export async function handleLink(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const walletAddress = interaction.options.getString(
    "wallet_address",
    true
  );

  if (!ETH_ADDRESS_RE.test(walletAddress)) {
    await interaction.reply({
      content:
        "Invalid Ethereum address. Must be `0x` followed by " +
        "40 hex characters.",
      flags: 64,
    });
    return;
  }

  // Acknowledge immediately so Discord doesn't time out
  await interaction.deferReply({ flags: 64 });

  try {
    await databaseService.linkDiscordUser(
      walletAddress,
      interaction.user.id
    );

    await interaction.editReply(
      `Wallet \`${walletAddress}\` linked to your Discord account.`
    );
  } catch (error) {
    console.error("[Link] Failed to link wallet:", error);
    await interaction.editReply(
      "Failed to link wallet. The database may be unavailable — " +
        "please try again later."
    );
  }
}

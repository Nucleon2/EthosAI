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
      content: "Invalid Ethereum address. Must be `0x` followed by 40 hex characters.",
      flags: 64,
    });
    return;
  }

  try {
    await databaseService.linkDiscordUser(
      walletAddress,
      interaction.user.id
    );

    await interaction.reply({
      content: `Wallet \`${walletAddress}\` linked to your Discord account.`,
      flags: 64,
    });
  } catch (error) {
    console.error("Failed to link wallet:", error);
    await interaction.reply({
      content: "Failed to link wallet. Please try again.",
      flags: 64,
    });
  }
}

/**
 * Zod validation schemas for form inputs.
 * Validates Ethereum wallet addresses and ERC-20 token contract addresses.
 */

import { z } from "zod";

/** Regex pattern for a valid Ethereum address (0x followed by 40 hex chars). */
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Schema for validating an Ethereum wallet address input. */
export const walletAddressSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .min(1, "Wallet address is required")
    .regex(ETH_ADDRESS_REGEX, "Must be a valid Ethereum address (0x...)"),
});

/** Schema for validating an ERC-20 token contract address input. */
export const tokenAddressSchema = z.object({
  tokenAddress: z
    .string()
    .trim()
    .min(1, "Token address is required")
    .regex(
      ETH_ADDRESS_REGEX,
      "Must be a valid Ethereum token contract address (0x...)"
    ),
});

export type WalletAddressFormData = z.infer<typeof walletAddressSchema>;
export type TokenAddressFormData = z.infer<typeof tokenAddressSchema>;

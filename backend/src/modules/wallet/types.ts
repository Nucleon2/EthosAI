import type { z } from "zod";

import type {
  ethereumAddressSchema,
  transactionSchema,
  internalTransactionSchema,
  erc20TransferSchema,
  erc721TransferSchema,
  balanceSchema,
  tokenBalanceSchema,
  walletInfoSchema,
  walletBehaviorDetailSchema,
  walletBehaviorInsightSchema,
  tokenBehaviorInsightSchema,
  etherscanResponseSchema
} from "./schemas";

export type EthereumAddress = z.infer<typeof ethereumAddressSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type InternalTransaction = z.infer<typeof internalTransactionSchema>;
export type ERC20Transfer = z.infer<typeof erc20TransferSchema>;
export type ERC721Transfer = z.infer<typeof erc721TransferSchema>;
export type Balance = z.infer<typeof balanceSchema>;
export type TokenBalance = z.infer<typeof tokenBalanceSchema>;
export type WalletInfo = z.infer<typeof walletInfoSchema>;
export type WalletBehaviorDetail = z.infer<typeof walletBehaviorDetailSchema>;
export type WalletBehaviorInsight = z.infer<typeof walletBehaviorInsightSchema>;
export type TokenBehaviorInsight = z.infer<typeof tokenBehaviorInsightSchema>;
export type EtherscanResponse = z.infer<typeof etherscanResponseSchema>;

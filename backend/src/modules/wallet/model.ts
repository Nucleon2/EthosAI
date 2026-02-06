import { z } from "zod";

/**
 * Zod schema for Ethereum address validation
 */
export const ethereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

/**
 * Zod schema for transaction data from Etherscan
 */
export const transactionSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  nonce: z.string(),
  blockHash: z.string(),
  transactionIndex: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  isError: z.string(),
  txreceipt_status: z.string().optional(),
  input: z.string(),
  contractAddress: z.string().optional(),
  cumulativeGasUsed: z.string(),
  gasUsed: z.string(),
  confirmations: z.string(),
  methodId: z.string().optional(),
  functionName: z.string().optional()
});

/**
 * Zod schema for internal transaction (contract execution)
 */
export const internalTransactionSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  contractAddress: z.string().optional(),
  input: z.string(),
  type: z.string(),
  gas: z.string(),
  gasUsed: z.string(),
  traceId: z.string().optional(),
  isError: z.string(),
  errCode: z.string().optional()
});

/**
 * Zod schema for ERC20 token transfer
 */
export const erc20TransferSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  nonce: z.string(),
  blockHash: z.string(),
  from: z.string(),
  contractAddress: z.string(),
  to: z.string(),
  value: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenDecimal: z.string(),
  transactionIndex: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  cumulativeGasUsed: z.string(),
  input: z.string().optional(),
  confirmations: z.string()
});

/**
 * Zod schema for ERC721 token transfer (NFT)
 */
export const erc721TransferSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  nonce: z.string(),
  blockHash: z.string(),
  from: z.string(),
  contractAddress: z.string(),
  to: z.string(),
  tokenID: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenDecimal: z.string(),
  transactionIndex: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  cumulativeGasUsed: z.string(),
  input: z.string().optional(),
  confirmations: z.string()
});

/**
 * Zod schema for account balance
 */
export const balanceSchema = z.object({
  account: z.string(),
  balance: z.string()
});

/**
 * Zod schema for token balance
 */
export const tokenBalanceSchema = z.object({
  contractAddress: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenDecimal: z.string(),
  balance: z.string()
});

/**
 * Zod schema for complete wallet information
 */
export const walletInfoSchema = z.object({
  address: ethereumAddressSchema,
  balance: z.string(),
  transactions: z.array(transactionSchema),
  internalTransactions: z.array(internalTransactionSchema),
  erc20Transfers: z.array(erc20TransferSchema),
  erc721Transfers: z.array(erc721TransferSchema)
});

/**
 * Behavioral analysis insight schemas
 */
export const walletBehaviorDetailSchema = z.object({
  label: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1)
});

export const walletBehaviorInsightSchema = z.object({
  summary: z.string(),
  activityLevel: z.object({
    level: z.enum([
      "dormant",
      "occasional",
      "steady",
      "active",
      "high-frequency"
    ]),
    rationale: z.string()
  }),
  dominantPatterns: z.array(walletBehaviorDetailSchema),
  tokenHabits: z.array(walletBehaviorDetailSchema),
  riskSignals: z.array(walletBehaviorDetailSchema),
  reflectionQuestions: z.array(z.string())
});

/**
 * TypeScript types inferred from Zod schemas
 */
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

/**
 * Etherscan API response schemas for validation
 */
export const etherscanResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  result: z.union([z.string(), z.array(z.any())])
});

export type EtherscanResponse = z.infer<typeof etherscanResponseSchema>;

import type { EthereumAddress, WalletInfo } from "./model";
import { ethereumAddressSchema, walletInfoSchema } from "./model";
import { createEtherscanAdapter } from "./adapters/etherscan.adapter";

const adapter = createEtherscanAdapter();

/**
 * Wallet service contract
 */
export type WalletServiceContract = {
  /**
   * Validate Ethereum address format
   */
  validateAddress(address: string): EthereumAddress;
  /**
   * Get complete wallet information including all transactions
   */
  getWalletInfo(
    address: string,
    transactionLimit?: number
  ): Promise<WalletInfo>;
  getWalletTokenActivity(
    address: string,
    tokenAddress: string,
    transactionLimit?: number
  ): Promise<WalletInfo>;
};

/**
 * Wallet service implementation
 * 
 * Orchestrates wallet data retrieval and normalization.
 * Coordinates between adapters and enforces business logic.
 */
export const WalletService: WalletServiceContract = {
  validateAddress(address: string): EthereumAddress {
    try {
      return ethereumAddressSchema.parse(address);
    } catch (error) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
  },

  async getWalletInfo(
    address: string,
    transactionLimit: number = 100
  ): Promise<WalletInfo> {
    const validatedAddress = WalletService.validateAddress(address);

    const walletData = await adapter.getCompleteWalletInfo(
      validatedAddress,
      transactionLimit
    );

    return walletInfoSchema.parse(walletData);
  },

  async getWalletTokenActivity(
    address: string,
    tokenAddress: string,
    transactionLimit: number = 100
  ): Promise<WalletInfo> {
    const validatedAddress = WalletService.validateAddress(address);
    const validatedToken = ethereumAddressSchema.parse(tokenAddress);

    const walletData = await adapter.getCompleteWalletInfo(
      validatedAddress,
      transactionLimit,
      validatedToken
    );

    return walletInfoSchema.parse(walletData);
  }
};

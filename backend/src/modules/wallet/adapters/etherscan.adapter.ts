import { z } from "zod";
import type {
  EthereumAddress,
  Transaction,
  InternalTransaction,
  ERC20Transfer,
  ERC721Transfer,
  EtherscanResponse,
  WalletInfo
} from "../types";
import {
  transactionSchema,
  internalTransactionSchema,
  erc20TransferSchema,
  erc721TransferSchema,
  etherscanResponseSchema
} from "../schemas";

/**
 * Etherscan API adapter
 * 
 * Pure data retrieval layer - no reasoning or interpretation.
 * Fetches on-chain data and normalizes it into typed structures.
 * 
 * Rate limited to 3 requests per second to comply with API limits.
 */
export class EtherscanAdapter {
  private readonly baseUrl: string = "https://api.etherscan.io/v2/api";
  private readonly apiKey: string;
  private readonly chainId: number;
  private readonly requestTimestamps: number[] = [];
  private readonly maxRequestsPerSecond: number = 2;

  constructor(apiKey: string, chainId: number = 1) {
    if (!apiKey) {
      throw new Error("Etherscan API key is required");
    }
    this.apiKey = apiKey;
    this.chainId = chainId;
  }

  /**
     * Rate limiter - ensures we don't exceed 2 requests per second
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove timestamps older than 1 second
    while (
      this.requestTimestamps.length > 0 && 
      this.requestTimestamps[0] < now - 1000
    ) {
      this.requestTimestamps.shift();
    }
    
     // If we've made 2 requests in the last second, wait
    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp) + 50; // +50ms buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Recursively check again after waiting
      return this.waitForRateLimit();
    }
    
    // Record this request timestamp
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Fetch data from Etherscan API with validation
   */
  private async fetchFromEtherscan(
    params: Record<string, string>
  ): Promise<EtherscanResponse> {
    // Apply rate limiting before making request
    await this.waitForRateLimit();
    
    const url = new URL(this.baseUrl);
    url.searchParams.append("chainid", this.chainId.toString());
    url.searchParams.append("apikey", this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(
          `Etherscan API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Validate response structure
      const validated = etherscanResponseSchema.parse(data);
      
      if (validated.status === "0" && validated.message !== "No transactions found") {
        const detail = typeof validated.result === "string" ? validated.result : "";
        const suffix = detail ? ` - ${detail}` : "";
        throw new Error(`Etherscan API error: ${validated.message}${suffix}`);
      }

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid Etherscan response format: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get ETH balance for an address
   */
  async getBalance(address: EthereumAddress): Promise<string> {
    const response = await this.fetchFromEtherscan({
      module: "account",
      action: "balance",
      address: address,
      tag: "latest"
    });

    if (typeof response.result !== "string") {
      throw new Error("Unexpected balance response format");
    }

    return response.result;
  }

  /**
   * Get normal transactions for an address
   */
  async getNormalTransactions(
    address: EthereumAddress,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<Transaction[]> {
    const response = await this.fetchFromEtherscan({
      module: "account",
      action: "txlist",
      address: address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc"
    });

    if (typeof response.result === "string") {
      // "No transactions found" returns empty array
      return [];
    }

    if (!Array.isArray(response.result)) {
      throw new Error("Unexpected transactions response format");
    }

    // Validate and parse each transaction
    return z.array(transactionSchema).parse(response.result);
  }

  /**
   * Get internal transactions (contract executions) for an address
   */
  async getInternalTransactions(
    address: EthereumAddress,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<InternalTransaction[]> {
    const response = await this.fetchFromEtherscan({
      module: "account",
      action: "txlistinternal",
      address: address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc"
    });

    if (typeof response.result === "string") {
      return [];
    }

    if (!Array.isArray(response.result)) {
      throw new Error("Unexpected internal transactions response format");
    }

    return z.array(internalTransactionSchema).parse(response.result);
  }

  /**
   * Get ERC20 token transfers for an address
   */
  async getERC20Transfers(
    address: EthereumAddress,
    contractAddress?: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<ERC20Transfer[]> {
    const params: Record<string, string> = {
      module: "account",
      action: "tokentx",
      address: address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc"
    };

    if (contractAddress) {
      params.contractaddress = contractAddress;
    }

    const response = await this.fetchFromEtherscan(params);

    if (typeof response.result === "string") {
      return [];
    }

    if (!Array.isArray(response.result)) {
      throw new Error("Unexpected ERC20 transfers response format");
    }

    return z.array(erc20TransferSchema).parse(response.result);
  }

  /**
   * Get ERC721 token transfers (NFTs) for an address
   */
  async getERC721Transfers(
    address: EthereumAddress,
    contractAddress?: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<ERC721Transfer[]> {
    const params: Record<string, string> = {
      module: "account",
      action: "tokennfttx",
      address: address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc"
    };

    if (contractAddress) {
      params.contractaddress = contractAddress;
    }

    const response = await this.fetchFromEtherscan(params);

    if (typeof response.result === "string") {
      return [];
    }

    if (!Array.isArray(response.result)) {
      throw new Error("Unexpected ERC721 transfers response format");
    }

    return z.array(erc721TransferSchema).parse(response.result);
  }

  /**
   * Get all wallet information in one call
   * 
   * Aggregates balance, transactions, internal transactions,
   * ERC20 transfers, and ERC721 transfers, then returns only
   * the behavioral analysis (no raw wallet data).
   */
  async getCompleteWalletInfo(
    address: EthereumAddress,
    transactionLimit: number = 100,
    tokenFilter?: string
  ): Promise<WalletInfo> {
    // Fetch all data in parallel for efficiency
    const [
      balance,
      transactions,
      internalTransactions,
      erc20Transfers,
      erc721Transfers
    ] = await Promise.all([
      this.getBalance(address),
      this.getNormalTransactions(address, 0, 99999999, 1, transactionLimit),
      this.getInternalTransactions(address, 0, 99999999, 1, transactionLimit),
      this.getERC20Transfers(address, tokenFilter, 0, 99999999, 1, transactionLimit),
      this.getERC721Transfers(address, undefined, 0, 99999999, 1, transactionLimit)
    ]);

    const walletInfo: WalletInfo = {
      address,
      balance,
      transactions,
      internalTransactions,
      erc20Transfers,
      erc721Transfers
    };

    return walletInfo;
  }
}

/**
 * Create an Etherscan adapter instance with API key from environment
 * 
 * @param chainId - Chain ID (default: 1 for Ethereum mainnet)
 */
export function createEtherscanAdapter(chainId: number = 1): EtherscanAdapter {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "ETHERSCAN_API_KEY environment variable is required"
    );
  }

  return new EtherscanAdapter(apiKey, chainId);
}

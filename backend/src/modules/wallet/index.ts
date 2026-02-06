import { Elysia, t } from "elysia";
import { walletService } from "./service";
import type { WalletServiceContract } from "./service";
import { analyzeWalletBehavior } from "./behavior-analyzer";
import { analyzeTokenBehavior } from "./token-behavior-analyzer";
import { formatEther } from "ethers";
import { marketService } from "../market/service";

/**
 * Wallet routes for Ethereum address analysis
 * 
 * Provides endpoints for retrieving wallet information,
 * transaction history, and token transfers.
 */
export function createWalletRoutes(
    providedService?: WalletServiceContract
) {
    const service = providedService || walletService;

    return new Elysia()
        /**
         * GET /api/address/:walletAddress
         * 
         * Get complete wallet information including:
         * - ETH balance
         * - Normal transactions
         * - Internal transactions
         * - ERC20 token transfers
         * - ERC721 NFT transfers
         * 
         * Query parameters:
         * - limit: Maximum number of transactions per type (default: 100, max: 10000)
         */
        .get(
            "/address/:walletAddress",
            async ({ params, query, set }) => {
                try {
                    const { walletAddress } = params;
                    const limit = Math.min(
                        parseInt(query.limit || "100", 10),
                        10000
                    );

                    const walletInfo = await service.getWalletInfo(
                        walletAddress,
                        limit
                    );

                    let behavior = null;
                    let behaviorError: string | undefined;

                    try {
                        behavior = await analyzeWalletBehavior(walletInfo);
                    } catch (analysisError) {
                        behaviorError =
                            analysisError instanceof Error
                                ? analysisError.message
                                : "Behavior analysis failed";
                    }

                    const analyzedAt = behavior ? new Date().toISOString() : undefined;

                    return {
                        success: true,
                        behavior,
                        meta: {
                            address: walletAddress,
                            balance: formatEther(walletInfo.balance),
                            transactionLimit: limit,
                            retrievedAt: new Date().toISOString(),
                            behaviorAnalyzedAt: analyzedAt,
                            behaviorModel: behavior ? Bun.env.DEEPSEEK_MODEL || "deepseek-chat" : undefined,
                            behaviorError
                        }
                    };
                } catch (error) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                        meta: {
                            retrievedAt: new Date().toISOString()
                        }
                    };
                }
            },
            {
                params: t.Object({
                    walletAddress: t.String({
                        description: "Ethereum wallet address (0x...)",
                        pattern: "^0x[a-fA-F0-9]{40}$"
                    })
                }),
                query: t.Object({
                    limit: t.Optional(
                        t.String({
                            description: "Maximum transactions per type (default: 100)",
                            pattern: "^[0-9]+$"
                        })
                    )
                })
            }
        )
        /**
         * GET /api/address/:walletAddress/token/:tokenAddress
         *
         * Get token-specific wallet behavior plus token market analysis:
         * - Token market snapshot (CoinGecko)
         * - Technical patterns explained in plain language
         * - News and events (CoinGecko status updates)
         * - Sentiment proxies (CoinGecko sentiment + community metrics)
         * - Behavioral insights tied to this token
         *
         * Query parameters:
         * - limit: Maximum number of token transfers to analyze (default: 100, max: 10000)
         * - days: Number of days for market chart data (default: 30, max: 365)
         */
        .get(
            "/address/:walletAddress/token/:tokenAddress",
            async ({ params, query, set }) => {
                try {
                    const { walletAddress, tokenAddress } = params;
                    const limit = Math.min(
                        parseInt(query.limit || "100", 10),
                        10000
                    );
                    const parsedDays = parseInt(query.days || "30", 10);
                    const normalizedDays = Number.isNaN(parsedDays) ? 30 : parsedDays;
                    const days = Math.min(Math.max(normalizedDays, 1), 365);

                    const [walletInfo, marketSnapshot] = await Promise.all([
                        service.getWalletTokenActivity(walletAddress, tokenAddress, limit),
                        marketService.buildTokenMarketSnapshot(tokenAddress, days)
                    ]);

                    let tokenBehavior = null;
                    let behaviorError: string | undefined;

                    try {
                        tokenBehavior = await analyzeTokenBehavior(
                            walletInfo,
                            tokenAddress,
                            marketSnapshot
                        );
                    } catch (analysisError) {
                        behaviorError =
                            analysisError instanceof Error
                                ? analysisError.message
                                : "Token behavior analysis failed";
                    }

                    return {
                        success: true,
                        tokenAnalysis: tokenBehavior,
                        marketSnapshot,
                        meta: {
                            address: walletAddress,
                            tokenAddress,
                            balance: formatEther(walletInfo.balance),
                            transactionLimit: limit,
                            marketDays: days,
                            retrievedAt: new Date().toISOString(),
                            analysisModel: tokenBehavior
                                ? Bun.env.DEEPSEEK_MODEL || "deepseek-chat"
                                : undefined,
                            analysisError: behaviorError
                        }
                    };
                } catch (error) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                        meta: {
                            retrievedAt: new Date().toISOString()
                        }
                    };
                }
            },
            {
                params: t.Object({
                    walletAddress: t.String({
                        description: "Ethereum wallet address (0x...)",
                        pattern: "^0x[a-fA-F0-9]{40}$"
                    }),
                    tokenAddress: t.String({
                        description: "ERC20 token contract address (0x...)",
                        pattern: "^0x[a-fA-F0-9]{40}$"
                    })
                }),
                query: t.Object({
                    limit: t.Optional(
                        t.String({
                            description: "Maximum token transfers (default: 100)",
                            pattern: "^[0-9]+$"
                        })
                    ),
                    days: t.Optional(
                        t.String({
                            description: "Days of market data (default: 30)",
                            pattern: "^[0-9]+$"
                        })
                    )
                })
            }
        )
}

import { Elysia, t } from "elysia";
import { WalletService } from "./service";
import type { WalletServiceContract } from "./service";
import { analyzeWalletBehavior } from "./behavior-analyzer";
import { formatEther } from "ethers";

/**
 * Wallet routes for Ethereum address analysis
 * 
 * Provides endpoints for retrieving wallet information,
 * transaction history, and token transfers.
 */
export function createWalletRoutes(
    walletService?: WalletServiceContract
) {
    const service = walletService || WalletService;

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
}

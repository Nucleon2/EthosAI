/**
 * Custom hook that handles token address submission and analysis.
 * Requires a wallet address to already be set in the store.
 */

import { useCallback } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { analyzeToken } from "@/services/api";

export function useTokenAnalysis() {
  const {
    walletAddress,
    tokenAddress,
    tokenAnalysisStatus,
    tokenAnalysis,
    tokenError,
    setTokenAddress,
    setTokenAnalysis,
    clearTokenAnalysis,
  } = useWalletStore();

  /** Whether the token has been successfully analyzed. */
  const isAnalyzed = tokenAnalysisStatus === "success" && tokenAnalysis !== null;

  /** Whether an analysis is currently in progress. */
  const isLoading = tokenAnalysisStatus === "loading";

  /**
   * Submits a token contract address for market + behavioral analysis.
   * The wallet address must already exist in the store.
   */
  const submitTokenAddress = useCallback(
    async (address: string) => {
      if (!walletAddress) {
        setTokenAnalysis("error", null, "Wallet address must be set first");
        return;
      }

      setTokenAddress(address);
      setTokenAnalysis("loading");

      try {
        const response = await analyzeToken(walletAddress, address);

        if (response.success && response.tokenAnalysis) {
          setTokenAnalysis("success", response.tokenAnalysis);
        } else {
          setTokenAnalysis(
            "error",
            null,
            response.error ?? "Analysis completed but no token data returned"
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setTokenAnalysis("error", null, message);
      }
    },
    [walletAddress, setTokenAddress, setTokenAnalysis]
  );

  return {
    tokenAddress,
    tokenAnalysisStatus,
    tokenAnalysis,
    tokenError,
    isAnalyzed,
    isLoading,
    submitTokenAddress,
    clearTokenAnalysis,
  };
}

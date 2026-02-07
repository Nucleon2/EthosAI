/**
 * Custom hook that handles token address submission and analysis.
 * Uses TanStack Query useMutation for the async request and updates
 * the Zustand store in lifecycle callbacks.
 * Requires a wallet address to already be set in the store.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWalletStore } from "@/stores/wallet-store";
import { analyzeToken } from "@/services/api";
import { queryKeys } from "@/lib/query-client";

export function useTokenAnalysis() {
  const queryClient = useQueryClient();
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

  const mutation = useMutation({
    mutationFn: (address: string) => {
      if (!walletAddress) {
        return Promise.reject(
          new Error("Wallet address must be set first")
        );
      }
      return analyzeToken(walletAddress, address);
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onMutate: (address) => {
      if (!walletAddress) {
        setTokenAnalysis(
          "error",
          null,
          "Wallet address must be set first"
        );
        return;
      }
      setTokenAddress(address);
      setTokenAnalysis("loading");
    },
    onSuccess: (response, address) => {
      if (response.success && response.tokenAnalysis) {
        setTokenAnalysis("success", response.tokenAnalysis);
      } else {
        setTokenAnalysis(
          "error",
          null,
          response.error ??
            "Analysis completed but no token data returned"
        );
      }
      // Invalidate token history so the dashboard refreshes
      if (walletAddress) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.token.history(walletAddress, address),
        });
      }
    },
    onError: (err) => {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setTokenAnalysis("error", null, message);
    },
  });

  /** Whether the token has been successfully analyzed. */
  const isAnalyzed =
    tokenAnalysisStatus === "success" && tokenAnalysis !== null;

  /** Whether an analysis is currently in progress. */
  const isLoading = tokenAnalysisStatus === "loading";

  /**
   * Submits a token contract address for market + behavioral analysis.
   * Delegates to the TanStack mutation which updates the store.
   */
  const submitTokenAddress = (address: string) => {
    mutation.mutate(address);
  };

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

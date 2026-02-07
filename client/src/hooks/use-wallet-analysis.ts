/**
 * Custom hook that handles wallet address submission and analysis.
 * Uses TanStack Query useMutation for the async request and updates
 * the Zustand store in lifecycle callbacks.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWalletStore } from "@/stores/wallet-store";
import { analyzeWallet, RateLimitError } from "@/services/api";
import { queryKeys } from "@/lib/query-client";

export function useWalletAnalysis() {
  const queryClient = useQueryClient();
  const {
    walletAddress,
    walletAnalysisStatus,
    walletBehavior,
    walletError,
    setWalletAddress,
    setWalletAnalysis,
  } = useWalletStore();

  const mutation = useMutation({
    mutationFn: (address: string) => analyzeWallet(address),
    retry: (failureCount, error) => {
      if (error instanceof RateLimitError) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onMutate: (address) => {
      setWalletAddress(address);
      setWalletAnalysis("loading");
    },
    onSuccess: (response, address) => {
      if (response.success && response.behavior) {
        setWalletAnalysis("success", response.behavior);
      } else {
        setWalletAnalysis(
          "error",
          null,
          response.error ??
            "Analysis completed but no behavior data returned"
        );
      }
      // Invalidate wallet history so the dashboard refreshes
      queryClient.invalidateQueries({
        queryKey: queryKeys.wallet.history(address),
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";
      setWalletAnalysis("error", null, message);
    },
  });

  /** Whether the wallet has been successfully analyzed. */
  const isAnalyzed =
    walletAnalysisStatus === "success" && walletBehavior !== null;

  /** Whether an analysis is currently in progress. */
  const isLoading = walletAnalysisStatus === "loading";

  /**
   * Submits a wallet address for behavioral analysis.
   * Delegates to the TanStack mutation which updates the store.
   */
  const submitWalletAddress = (address: string) => {
    mutation.mutate(address);
  };

  return {
    walletAddress,
    walletAnalysisStatus,
    walletBehavior,
    walletError,
    isAnalyzed,
    isLoading,
    submitWalletAddress,
  };
}

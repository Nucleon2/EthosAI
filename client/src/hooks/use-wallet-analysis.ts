/**
 * Custom hook that handles wallet address submission and analysis.
 * Coordinates between the form submission, API call, and Zustand store updates.
 */

import { useCallback } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { analyzeWallet } from "@/services/api";

export function useWalletAnalysis() {
  const {
    walletAddress,
    walletAnalysisStatus,
    walletBehavior,
    walletError,
    setWalletAddress,
    setWalletAnalysis,
  } = useWalletStore();

  /** Whether the wallet has been successfully analyzed. */
  const isAnalyzed = walletAnalysisStatus === "success" && walletBehavior !== null;

  /** Whether an analysis is currently in progress. */
  const isLoading = walletAnalysisStatus === "loading";

  /**
   * Submits a wallet address for behavioral analysis.
   * Updates the store with loading, success, or error states.
   */
  const submitWalletAddress = useCallback(
    async (address: string) => {
      setWalletAddress(address);
      setWalletAnalysis("loading");

      try {
        const response = await analyzeWallet(address);

        if (response.success && response.behavior) {
          setWalletAnalysis("success", response.behavior);
        } else {
          setWalletAnalysis(
            "error",
            null,
            response.error ?? "Analysis completed but no behavior data returned"
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setWalletAnalysis("error", null, message);
      }
    },
    [setWalletAddress, setWalletAnalysis]
  );

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

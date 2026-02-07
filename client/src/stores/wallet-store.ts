/**
 * Zustand store with localStorage persistence for wallet and token state.
 * Tracks the user's wallet address, analysis status, and token analysis data.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  WalletBehaviorInsight,
  TokenAnalysis,
  TokenAnalysisMeta,
} from "@/types/api";

/** Possible analysis states for async operations. */
export type AnalysisStatus = "idle" | "loading" | "success" | "error";

interface WalletState {
  /** The user's Ethereum wallet address, persisted to localStorage. */
  walletAddress: string | null;
  /** Status of the wallet behavior analysis request. */
  walletAnalysisStatus: AnalysisStatus;
  /** Wallet behavior insight returned by the backend. */
  walletBehavior: WalletBehaviorInsight | null;
  /** Error message from a failed wallet analysis. */
  walletError: string | null;

  /** The currently analyzed token contract address. */
  tokenAddress: string | null;
  /** Status of the token analysis request. */
  tokenAnalysisStatus: AnalysisStatus;
  /** Token analysis data returned by the backend. */
  tokenAnalysis: TokenAnalysis | null;
  /** Metadata returned alongside the token analysis (balances, prices). */
  tokenAnalysisMeta: TokenAnalysisMeta | null;
  /** Error message from a failed token analysis. */
  tokenError: string | null;
}

interface WalletActions {
  /** Sets the wallet address and resets analysis state. */
  setWalletAddress: (address: string) => void;
  /** Updates the wallet analysis status and optional data. */
  setWalletAnalysis: (
    status: AnalysisStatus,
    behavior?: WalletBehaviorInsight | null,
    error?: string | null
  ) => void;

  /** Sets the token address for analysis. */
  setTokenAddress: (address: string) => void;
  /** Updates the token analysis status and optional data. */
  setTokenAnalysis: (
    status: AnalysisStatus,
    analysis?: TokenAnalysis | null,
    error?: string | null,
    meta?: TokenAnalysisMeta | null
  ) => void;

  /** Clears token analysis state (address, data, status). */
  clearTokenAnalysis: () => void;
  /** Resets the entire store to its initial state. */
  reset: () => void;
}

const initialState: WalletState = {
  walletAddress: null,
  walletAnalysisStatus: "idle",
  walletBehavior: null,
  walletError: null,
  tokenAddress: null,
  tokenAnalysisStatus: "idle",
  tokenAnalysis: null,
  tokenAnalysisMeta: null,
  tokenError: null,
};

export const useWalletStore = create<WalletState & WalletActions>()(
  persist(
    (set) => ({
      ...initialState,

      setWalletAddress: (address) =>
        set({
          walletAddress: address,
          walletAnalysisStatus: "idle",
          walletBehavior: null,
          walletError: null,
          tokenAddress: null,
          tokenAnalysisStatus: "idle",
          tokenAnalysis: null,
          tokenAnalysisMeta: null,
          tokenError: null,
        }),

      setWalletAnalysis: (status, behavior, error) =>
        set({
          walletAnalysisStatus: status,
          walletBehavior: behavior ?? null,
          walletError: error ?? null,
        }),

      setTokenAddress: (address) =>
        set({
          tokenAddress: address,
          tokenAnalysisStatus: "idle",
          tokenAnalysis: null,
          tokenAnalysisMeta: null,
          tokenError: null,
        }),

      setTokenAnalysis: (status, analysis, error, meta) =>
        set({
          tokenAnalysisStatus: status,
          tokenAnalysis: analysis ?? null,
          tokenAnalysisMeta: meta ?? null,
          tokenError: error ?? null,
        }),

      clearTokenAnalysis: () =>
        set({
          tokenAddress: null,
          tokenAnalysisStatus: "idle",
          tokenAnalysis: null,
          tokenAnalysisMeta: null,
          tokenError: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "derive-wallet-store",
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        walletAnalysisStatus: state.walletAnalysisStatus,
        walletBehavior: state.walletBehavior,
      }),
    }
  )
);

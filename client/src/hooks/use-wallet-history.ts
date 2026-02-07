/**
 * Hook for fetching wallet analysis history from the database.
 * Returns paginated past analyses without triggering new ones.
 */

import { useCallback, useEffect, useState } from "react";
import { getWalletAnalysisHistory } from "@/services/api";
import type { WalletAnalysisRecord } from "@/types/api";

interface UseWalletHistoryResult {
  analyses: WalletAnalysisRecord[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 10;

export function useWalletHistory(
  walletAddress: string | null
): UseWalletHistoryResult {
  const [analyses, setAnalyses] = useState<WalletAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (!walletAddress) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getWalletAnalysisHistory(
          walletAddress,
          PAGE_SIZE,
          pageOffset
        );

        if (response.success && response.analyses) {
          setAnalyses((prev) =>
            append ? [...prev, ...response.analyses!] : response.analyses!
          );
          setHasMore(response.analyses.length === PAGE_SIZE);
        } else {
          setError(response.error ?? "Failed to load wallet history");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [walletAddress]
  );

  /** Initial fetch on mount or when wallet changes. */
  useEffect(() => {
    setAnalyses([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }, [fetchPage]);

  /** Load next page of results. */
  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchPage(nextOffset, true);
  }, [offset, fetchPage]);

  /** Refresh from the beginning. */
  const refresh = useCallback(() => {
    setAnalyses([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }, [fetchPage]);

  return { analyses, isLoading, error, hasMore, loadMore, refresh };
}

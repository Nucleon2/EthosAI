/**
 * Hook for fetching wallet analysis history from the database.
 * Returns paginated past analyses without triggering new ones.
 *
 * Uses TanStack Query's useInfiniteQuery for cursor-based
 * "load more" pagination with automatic caching.
 */

import { useCallback } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getWalletAnalysisHistory } from "@/services/api";
import { queryKeys } from "@/lib/query-client";
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
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.wallet.history(walletAddress ?? ""),
    queryFn: ({ pageParam }) =>
      getWalletAnalysisHistory(walletAddress!, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (
        !lastPage.success ||
        !lastPage.analyses ||
        lastPage.analyses.length < PAGE_SIZE
      ) {
        return undefined;
      }
      return lastPageParam + PAGE_SIZE;
    },
    enabled: walletAddress !== null,
  });

  /** Flatten all pages into a single array of analyses. */
  const analyses =
    query.data?.pages.flatMap((page) =>
      page.success && page.analyses ? page.analyses : []
    ) ?? [];

  /** Derive hasMore from whether a next page param exists. */
  const hasMore = query.hasNextPage;

  /** Extract error from the query or the response body. */
  const firstErrorPage = query.data?.pages.find((p) => !p.success);
  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : "An unexpected error occurred"
    : firstErrorPage
      ? (firstErrorPage.error ?? "Failed to load wallet history")
      : null;

  /** Load next page of results. */
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  /** Refresh from the beginning. */
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.history(walletAddress ?? ""),
    });
  }, [queryClient, walletAddress]);

  return {
    analyses,
    isLoading: query.isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

/**
 * Hook for fetching Discord coaching session history.
 * Returns paginated past sessions for a given wallet address.
 *
 * Uses TanStack Query's useInfiniteQuery for "load more" pagination.
 */

import { useCallback } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getDiscordSessions } from "@/services/api";
import { queryKeys } from "@/lib/query-client";
import type { DiscordSession } from "@/types/api";

interface UseDiscordSessionsResult {
  sessions: DiscordSession[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 10;

export function useDiscordSessions(
  walletAddress: string | null
): UseDiscordSessionsResult {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.discord.sessions(walletAddress ?? ""),
    queryFn: ({ pageParam }) =>
      getDiscordSessions(walletAddress!, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (
        !lastPage.success ||
        !lastPage.sessions ||
        lastPage.sessions.length < PAGE_SIZE
      ) {
        return undefined;
      }
      return lastPageParam + PAGE_SIZE;
    },
    enabled: walletAddress !== null,
  });

  /** Flatten all pages into a single array of sessions. */
  const sessions =
    query.data?.pages.flatMap((page) =>
      page.success && page.sessions ? page.sessions : []
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
      ? (firstErrorPage.error ?? "Failed to load sessions")
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
      queryKey: queryKeys.discord.sessions(walletAddress ?? ""),
    });
  }, [queryClient, walletAddress]);

  return {
    sessions,
    isLoading: query.isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

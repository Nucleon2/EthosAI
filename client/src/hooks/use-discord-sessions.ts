/**
 * Hook for fetching Discord coaching session history.
 * Returns paginated past sessions for a given wallet address.
 */

import { useCallback, useEffect, useState } from "react";
import { getDiscordSessions } from "@/services/api";
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
  const [sessions, setSessions] = useState<DiscordSession[]>([]);
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
        const response = await getDiscordSessions(
          walletAddress,
          PAGE_SIZE,
          pageOffset
        );

        if (response.success && response.sessions) {
          setSessions((prev) =>
            append ? [...prev, ...response.sessions!] : response.sessions!
          );
          setHasMore(response.sessions.length === PAGE_SIZE);
        } else {
          setError(response.error ?? "Failed to load sessions");
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

  useEffect(() => {
    setSessions([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchPage(nextOffset, true);
  }, [offset, fetchPage]);

  const refresh = useCallback(() => {
    setSessions([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }, [fetchPage]);

  return { sessions, isLoading, error, hasMore, loadMore, refresh };
}

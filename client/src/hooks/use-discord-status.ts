/**
 * Hook for polling the Discord bot status at a regular interval.
 * Returns live status including online state, username, and guild count.
 * Exposes startBot / stopBot actions that auto-refresh status after toggling.
 *
 * While the bot is in the "connecting" state the poll interval drops to
 * 2 seconds so the UI updates quickly once the gateway handshake completes.
 *
 * Uses TanStack Query for automatic polling, caching, and deduplication.
 */

import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getDiscordStatus,
  startDiscordBot,
  stopDiscordBot,
} from "@/services/api";
import { queryKeys } from "@/lib/query-client";
import type { DiscordStatusResponse } from "@/types/api";

interface UseDiscordStatusResult {
  status: DiscordStatusResponse | null;
  isLoading: boolean;
  isToggling: boolean;
  isConnecting: boolean;
  error: string | null;
  refresh: () => void;
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
}

/** Normal polling cadence. */
const POLL_INTERVAL_MS = 10_000;
/** Faster cadence while the bot is connecting to the Discord gateway. */
const CONNECTING_POLL_INTERVAL_MS = 2_000;

export function useDiscordStatus(): UseDiscordStatusResult {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: queryKeys.discord.status(),
    queryFn: getDiscordStatus,
    refetchInterval: (query) => {
      const data = query.state.data as DiscordStatusResponse | undefined;
      if (data?.status === "connecting") {
        return CONNECTING_POLL_INTERVAL_MS;
      }
      return POLL_INTERVAL_MS;
    },
  });

  const startMutation = useMutation({
    mutationFn: startDiscordBot,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discord.status(),
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopDiscordBot,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discord.status(),
      });
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.discord.status(),
    });
  }, [queryClient]);

  const startBot = useCallback(async () => {
    await startMutation.mutateAsync();
  }, [startMutation]);

  const stopBot = useCallback(async () => {
    await stopMutation.mutateAsync();
  }, [stopMutation]);

  /** Derive isToggling from either mutation being pending. */
  const isToggling =
    startMutation.isPending || stopMutation.isPending;

  const isConnecting = statusQuery.data?.status === "connecting";

  /** Extract error message from query error. */
  const error = statusQuery.error
    ? statusQuery.error instanceof Error
      ? statusQuery.error.message
      : "Failed to fetch status"
    : null;

  return {
    status: statusQuery.data ?? null,
    isLoading: statusQuery.isLoading,
    isToggling,
    isConnecting,
    error,
    refresh,
    startBot,
    stopBot,
  };
}

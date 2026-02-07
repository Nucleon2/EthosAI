/**
 * Hook for polling the Discord bot status at a regular interval.
 * Returns live status including online state, username, and guild count.
 */

import { useCallback, useEffect, useState } from "react";
import { getDiscordStatus } from "@/services/api";
import type { DiscordStatusResponse } from "@/types/api";

interface UseDiscordStatusResult {
  status: DiscordStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 10_000;

export function useDiscordStatus(): UseDiscordStatusResult {
  const [status, setStatus] = useState<DiscordStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getDiscordStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch status"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, isLoading, error, refresh: fetchStatus };
}

/**
 * Hook for polling the Discord bot status at a regular interval.
 * Returns live status including online state, username, and guild count.
 * Exposes startBot / stopBot actions that auto-refresh status after toggling.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getDiscordStatus,
  startDiscordBot,
  stopDiscordBot,
} from "@/services/api";
import type { DiscordStatusResponse } from "@/types/api";

interface UseDiscordStatusResult {
  status: DiscordStatusResponse | null;
  isLoading: boolean;
  isToggling: boolean;
  error: string | null;
  refresh: () => void;
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
}

const POLL_INTERVAL_MS = 10_000;

export function useDiscordStatus(): UseDiscordStatusResult {
  const [status, setStatus] = useState<DiscordStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
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

  const startBot = useCallback(async () => {
    setIsToggling(true);
    try {
      await startDiscordBot();
      await fetchStatus();
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to start Discord bot");
    } finally {
      setIsToggling(false);
    }
  }, [fetchStatus]);

  const stopBot = useCallback(async () => {
    setIsToggling(true);
    try {
      await stopDiscordBot();
      await fetchStatus();
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to stop Discord bot");
    } finally {
      setIsToggling(false);
    }
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    isToggling,
    error,
    refresh: fetchStatus,
    startBot,
    stopBot,
  };
}

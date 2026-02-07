/**
 * Shared TanStack Query client and query key factory.
 * Created at module scope to ensure a single instance per app load.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance.
 * Initialized once at module level (not inside a component)
 * to prevent re-creation on re-renders.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Centralized query key factory.
 * Uses primitive values for cache key segments to ensure
 * stable identity and narrow invalidation.
 */
export const queryKeys = {
  discord: {
    status: () => ["discord", "status"] as const,
    sessions: (wallet: string) =>
      ["discord", "sessions", wallet] as const,
  },
  wallet: {
    history: (wallet: string) =>
      ["wallet", "history", wallet] as const,
  },
  token: {
    history: (wallet: string, token: string) =>
      ["token", "history", wallet, token] as const,
  },
} as const;

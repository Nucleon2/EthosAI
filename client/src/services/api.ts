/**
 * API client for communicating with the backend.
 * All requests target the ElysiaJS server running at the configured base URL.
 */

import type {
  WalletAnalysisResponse,
  TokenAnalysisResponse,
  SocialPostsResponse,
  TokenAnalysis,
  WalletAnalysisHistoryResponse,
  TokenAnalysisHistoryResponse,
  DiscordStatusResponse,
  DiscordBotActionResponse,
  DiscordSessionsResponse,
  DiscordLatestSessionResponse,
} from "@/types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Wallet Analysis
// ---------------------------------------------------------------------------

/**
 * Fetches wallet behavior analysis for the given Ethereum address.
 * Hits GET /api/address/:walletAddress on the backend.
 */
export async function analyzeWallet(
  walletAddress: string,
  limit = 100
): Promise<WalletAnalysisResponse> {
  const url = new URL(`/api/address/${walletAddress}`, API_BASE_URL);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ?? `Wallet analysis failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * Generates social media posts for Threads, X, and LinkedIn
 * based on a completed token analysis.
 * Hits POST /api/social/generate on the backend.
 */
export async function generateSocialPosts(
  tokenAnalysis: TokenAnalysis,
  tokenAddress: string,
  tokenSymbol?: string
): Promise<SocialPostsResponse> {
  const url = new URL("/api/social/generate", API_BASE_URL);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenAnalysis,
      tokenAddress,
      tokenSymbol,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ?? `Social post generation failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * Fetches token-specific market and behavioral analysis.
 * Hits GET /api/address/:walletAddress/token/:tokenAddress on the backend.
 */
export async function analyzeToken(
  walletAddress: string,
  tokenAddress: string,
  options?: { limit?: number; days?: number }
): Promise<TokenAnalysisResponse> {
  const url = new URL(
    `/api/address/${walletAddress}/token/${tokenAddress}`,
    API_BASE_URL
  );

  if (options?.limit) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.days) {
    url.searchParams.set("days", String(options.days));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ?? `Token analysis failed (${response.status})`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// History Endpoints (read-only, no new analysis triggered)
// ---------------------------------------------------------------------------

/**
 * Fetches paginated wallet analysis history from the database.
 * Hits GET /api/address/:walletAddress/history.
 */
export async function getWalletAnalysisHistory(
  walletAddress: string,
  limit = 10,
  offset = 0
): Promise<WalletAnalysisHistoryResponse> {
  const url = new URL(
    `/api/address/${walletAddress}/history`,
    API_BASE_URL
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ??
        `Wallet history fetch failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * Fetches paginated token analysis history for a wallet + token pair.
 * Hits GET /api/address/:walletAddress/token/:tokenAddress/history.
 */
export async function getTokenAnalysisHistory(
  walletAddress: string,
  tokenAddress: string,
  limit = 10,
  offset = 0
): Promise<TokenAnalysisHistoryResponse> {
  const url = new URL(
    `/api/address/${walletAddress}/token/${tokenAddress}/history`,
    API_BASE_URL
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ??
        `Token history fetch failed (${response.status})`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Discord Endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches the current Discord bot status.
 * Hits GET /api/discord/status.
 */
export async function getDiscordStatus(): Promise<DiscordStatusResponse> {
  const url = new URL("/api/discord/status", API_BASE_URL);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `Discord status fetch failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * Starts the Discord coaching bot.
 * Hits POST /api/discord/start.
 */
export async function startDiscordBot(): Promise<DiscordBotActionResponse> {
  const url = new URL("/api/discord/start", API_BASE_URL);
  const response = await fetch(url.toString(), { method: "POST" });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to start Discord bot (${response.status})`
    );
  }

  return response.json();
}

/**
 * Stops the Discord coaching bot.
 * Hits POST /api/discord/stop.
 */
export async function stopDiscordBot(): Promise<DiscordBotActionResponse> {
  const url = new URL("/api/discord/stop", API_BASE_URL);
  const response = await fetch(url.toString(), { method: "POST" });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to stop Discord bot (${response.status})`
    );
  }

  return response.json();
}

/**
 * Fetches paginated coaching session history for a wallet.
 * Hits GET /api/discord/sessions/:walletAddress.
 */
export async function getDiscordSessions(
  walletAddress: string,
  limit = 10,
  offset = 0
): Promise<DiscordSessionsResponse> {
  const url = new URL(
    `/api/discord/sessions/${walletAddress}`,
    API_BASE_URL
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ??
        `Discord sessions fetch failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * Fetches the most recent coaching session for a wallet.
 * Hits GET /api/discord/sessions/:walletAddress/latest.
 */
export async function getLatestDiscordSession(
  walletAddress: string
): Promise<DiscordLatestSessionResponse> {
  const url = new URL(
    `/api/discord/sessions/${walletAddress}/latest`,
    API_BASE_URL
  );

  const response = await fetch(url.toString());

  // 404 is expected when no sessions exist — return the response body
  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ??
        `Latest session fetch failed (${response.status})`
    );
  }

  return response.json();
}

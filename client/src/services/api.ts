/**
 * API client for communicating with the backend wallet endpoints.
 * All requests target the ElysiaJS server running at the configured base URL.
 */

import type {
  WalletAnalysisResponse,
  TokenAnalysisResponse,
  SocialPostsResponse,
  TokenAnalysis,
} from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

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

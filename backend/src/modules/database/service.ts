import { prisma } from "./prisma";
import type { PrismaClient, Prisma } from "@generated/prisma";

/** JSON-compatible array type for Prisma JSON columns. */
type JsonArray = Prisma.InputJsonValue[];

/**
 * Ensures a User record exists for the given wallet address.
 * Returns the existing user or creates a new one.
 */
async function findOrCreateUser(
  walletAddress: string,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.user.upsert({
    where: { walletAddress: normalized },
    update: { lastActiveAt: new Date() },
    create: { walletAddress: normalized },
  });
}

/**
 * Persists a WalletBehaviorInsight analysis result.
 *
 * Accepts the raw insight object matching walletBehaviorInsightSchema
 * and flattens it into relational + JSON columns.
 */
async function saveWalletAnalysis(
  walletAddress: string,
  insight: {
    summary: string;
    activityLevel: { level: string; rationale: string };
    dominantPatterns: { label: string; description: string; confidence: number }[];
    tokenHabits: { label: string; description: string; confidence: number }[];
    riskSignals: { label: string; description: string; confidence: number }[];
    reflectionQuestions: string[];
  },
  meta?: { model?: string; ethBalance?: string },
  client: PrismaClient = prisma
) {
  const user = await findOrCreateUser(walletAddress, client);

  return client.walletAnalysis.create({
    data: {
      userId: user.id,
      summary: insight.summary,
      activityLevel: insight.activityLevel.level,
      activityLevelRationale: insight.activityLevel.rationale,
      dominantPatterns: insight.dominantPatterns as unknown as JsonArray,
      tokenHabits: insight.tokenHabits as unknown as JsonArray,
      riskSignals: insight.riskSignals as unknown as JsonArray,
      reflectionQuestions: insight.reflectionQuestions,
      model: meta?.model ?? null,
      ethBalance: meta?.ethBalance ?? null,
    },
  });
}

/**
 * Persists a TokenBehaviorInsight analysis result.
 *
 * Accepts the raw insight object matching tokenBehaviorInsightSchema
 * and stores complex nested structures as JSON.
 */
async function saveTokenAnalysis(
  walletAddress: string,
  tokenAddress: string,
  insight: {
    marketBrief: string;
    technicalPatterns: { label: string; significance: string; confidence: number }[];
    newsSummary: { title: string; summary: string; category?: string; source?: string; url?: string; date?: string }[];
    sentiment: { overall: string; sources: { source: string; signal: string; detail: string; score: number }[] };
    transferSizeMetrics: Record<string, unknown>;
    behavioralInsights: Record<string, unknown>;
  },
  meta?: { model?: string; ethBalance?: string; marketDays?: number },
  client: PrismaClient = prisma
) {
  const user = await findOrCreateUser(walletAddress, client);

  return client.tokenAnalysis.create({
    data: {
      userId: user.id,
      tokenAddress: tokenAddress.toLowerCase(),
      marketBrief: insight.marketBrief,
      technicalPatterns: insight.technicalPatterns as unknown as JsonArray,
      newsSummary: insight.newsSummary as unknown as JsonArray,
      sentiment: insight.sentiment as unknown as Prisma.InputJsonValue,
      transferSizeMetrics: insight.transferSizeMetrics as unknown as Prisma.InputJsonValue,
      behavioralInsights: insight.behavioralInsights as unknown as Prisma.InputJsonValue,
      model: meta?.model ?? null,
      ethBalance: meta?.ethBalance ?? null,
      marketDays: meta?.marketDays ?? null,
    },
  });
}

/**
 * Retrieves the most recent wallet analysis for a given address.
 */
async function getLatestWalletAnalysis(
  walletAddress: string,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.walletAnalysis.findFirst({
    where: { user: { walletAddress: normalized } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves the most recent token analysis for a given wallet + token pair.
 */
async function getLatestTokenAnalysis(
  walletAddress: string,
  tokenAddress: string,
  client: PrismaClient = prisma
) {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedToken = tokenAddress.toLowerCase();

  return client.tokenAnalysis.findFirst({
    where: {
      user: { walletAddress: normalizedWallet },
      tokenAddress: normalizedToken,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves analysis history for a wallet (paginated).
 */
async function getWalletAnalysisHistory(
  walletAddress: string,
  limit: number = 10,
  offset: number = 0,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.walletAnalysis.findMany({
    where: { user: { walletAddress: normalized } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Retrieves token analysis history for a wallet + token pair (paginated).
 */
async function getTokenAnalysisHistory(
  walletAddress: string,
  tokenAddress: string,
  limit: number = 10,
  offset: number = 0,
  client: PrismaClient = prisma
) {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedToken = tokenAddress.toLowerCase();

  return client.tokenAnalysis.findMany({
    where: {
      user: { walletAddress: normalizedWallet },
      tokenAddress: normalizedToken,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Retrieves the most recent token analyses across ALL tokens
 * for a given wallet address — useful for building coaching
 * context where we want a cross-token behavioral picture.
 */
async function getAllRecentTokenAnalyses(
  walletAddress: string,
  limit: number = 5,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.tokenAnalysis.findMany({
    where: { user: { walletAddress: normalized } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Links a Discord user ID to an existing wallet-based user.
 *
 * First ensures the user exists (via findOrCreateUser), then
 * sets the discordUserId field. Returns the updated user.
 */
async function linkDiscordUser(
  walletAddress: string,
  discordUserId: string,
  client: PrismaClient = prisma
) {
  const user = await findOrCreateUser(walletAddress, client);

  return client.user.update({
    where: { id: user.id },
    data: { discordUserId },
  });
}

/**
 * Finds a user by their Discord ID.
 * Returns null if no user is linked to that Discord account.
 */
async function findUserByDiscordId(
  discordUserId: string,
  client: PrismaClient = prisma
) {
  return client.user.findFirst({
    where: { discordUserId },
  });
}

// ---------------------------------------------------------------------------
// Discord Sessions
// ---------------------------------------------------------------------------

/**
 * Creates a completed Discord coaching session record.
 */
async function saveDiscordSession(
  data: {
    userId: string;
    discordUserId: string;
    guildId: string;
    channelId: string;
    startedAt: Date;
    endedAt: Date;
    nudgesDelivered: string[];
    topicsDiscussed: string[];
    sessionSummary: string;
  },
  client: PrismaClient = prisma
) {
  return client.discordSession.create({
    data: {
      userId: data.userId,
      discordUserId: data.discordUserId,
      guildId: data.guildId,
      channelId: data.channelId,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      status: "completed",
      nudgesDelivered: data.nudgesDelivered,
      topicsDiscussed: data.topicsDiscussed,
      sessionSummary: data.sessionSummary,
    },
  });
}

/**
 * Retrieves Discord session history for a wallet address (paginated).
 */
async function getDiscordSessionHistory(
  walletAddress: string,
  limit: number = 10,
  offset: number = 0,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.discordSession.findMany({
    where: { user: { walletAddress: normalized } },
    orderBy: { startedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Retrieves the most recent Discord session for a wallet address.
 */
async function getLatestDiscordSession(
  walletAddress: string,
  client: PrismaClient = prisma
) {
  const normalized = walletAddress.toLowerCase();

  return client.discordSession.findFirst({
    where: { user: { walletAddress: normalized } },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Retrieves any currently active Discord session for a user.
 */
async function getActiveDiscordSession(
  discordUserId: string,
  client: PrismaClient = prisma
) {
  return client.discordSession.findFirst({
    where: { discordUserId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Database service — centralized data access layer.
 *
 * All persistence logic for the agentic intelligence framework
 * goes through this service. Routes and agents should never
 * call Prisma directly.
 */
export const databaseService = {
  findOrCreateUser,
  linkDiscordUser,
  findUserByDiscordId,
  saveWalletAnalysis,
  saveTokenAnalysis,
  getLatestWalletAnalysis,
  getLatestTokenAnalysis,
  getWalletAnalysisHistory,
  getTokenAnalysisHistory,
  getAllRecentTokenAnalyses,
  saveDiscordSession,
  getDiscordSessionHistory,
  getLatestDiscordSession,
  getActiveDiscordSession,
};

/**
 * Shared API response types matching the backend wallet module.
 * These mirror the Zod schemas defined in the backend's schemas.ts.
 */

/** Detail used across behavior patterns, token habits, and risk signals. */
export interface BehaviorDetail {
  label: string;
  description: string;
  confidence: number;
}

/** Activity level classification from the behavior analyzer. */
export interface ActivityLevel {
  level: "dormant" | "occasional" | "steady" | "active" | "high-frequency";
  rationale: string;
}

/** AI-generated behavioral insight for a wallet. */
export interface WalletBehaviorInsight {
  summary: string;
  activityLevel: ActivityLevel;
  dominantPatterns: BehaviorDetail[];
  tokenHabits: BehaviorDetail[];
  riskSignals: BehaviorDetail[];
  reflectionQuestions: string[];
}

/** Metadata returned with the wallet analysis response. */
export interface WalletAnalysisMeta {
  address: string;
  balance?: string;
  transactionLimit: number;
  retrievedAt: string;
  behaviorAnalyzedAt?: string;
  behaviorModel?: string;
  behaviorError?: string;
}

/** Full response from GET /api/address/:walletAddress */
export interface WalletAnalysisResponse {
  success: boolean;
  behavior?: WalletBehaviorInsight;
  error?: string;
  meta: WalletAnalysisMeta;
}

/** Technical pattern from token market analysis. */
export interface TechnicalPattern {
  label: string;
  significance: string;
  confidence: number;
}

/** News item from market analysis. */
export interface NewsItem {
  title: string;
  summary: string;
  category?: string;
  source?: string;
  url?: string;
  date?: string;
}

/** Sentiment source detail. */
export interface SentimentSource {
  source: string;
  signal: "positive" | "neutral" | "negative" | "unknown";
  detail: string;
  score: number;
}

/** Aggregated sentiment data. */
export interface Sentiment {
  overall: "positive" | "neutral" | "negative" | "mixed" | "unknown";
  sources: SentimentSource[];
}

/** Transfer size metrics computed server-side. */
export interface TransferSizeMetrics {
  averageTransferSize: number | null;
  medianTransferSize: number | null;
  largeTransferThreshold: number | null;
  largeTransferCount: number | null;
  transferSizeUnits: "base";
  averageAbsWindowMoveForLarge: number | null;
  windowHours: number | null;
  largeTransfersWithPriceData: number | null;
  largeTransfersNearMove: number | null;
  percentLargeTransfersNearMove: number | null;
  dominantWindowDirectionForLarge:
  | "up"
  | "down"
  | "mixed"
  | "flat"
  | "unknown";
}

/** Behavioral insights specific to a single token. */
export interface TokenBehavioralInsights {
  emotionalSignals: BehaviorDetail[];
  nudges: string[];
  winningPatterns: string[];
  losingPatterns: string[];
  reflectionPrompts: string[];
  habitCelebrations: string[];
  dataGaps: string[];
}

/** Complete token analysis from the backend. */
export interface TokenAnalysis {
  marketBrief: string;
  technicalPatterns: TechnicalPattern[];
  newsSummary: NewsItem[];
  sentiment: Sentiment;
  transferSizeMetrics: TransferSizeMetrics;
  behavioralInsights: TokenBehavioralInsights;
}

/** Metadata for the token analysis response. */
export interface TokenAnalysisMeta {
  address: string;
  tokenAddress: string;
  balance?: string;
  transactionLimit: number;
  marketDays: number;
  retrievedAt: string;
  analysisModel?: string;
  analysisError?: string;
}

/** Full response from GET /api/address/:walletAddress/token/:tokenAddress */
export interface TokenAnalysisResponse {
  success: boolean;
  tokenAnalysis?: TokenAnalysis;
  error?: string;
  meta: TokenAnalysisMeta;
}

/** A single generated social media post for a specific platform. */
export interface SocialPost {
  platform: "threads" | "x" | "linkedin";
  content: string;
}

/** All three platform posts returned from the generation endpoint. */
export interface SocialPostsResult {
  threads: SocialPost;
  x: SocialPost;
  linkedin: SocialPost;
}

/** Full response from POST /api/social/generate */
export interface SocialPostsResponse {
  success: boolean;
  posts?: SocialPostsResult;
  error?: string;
  meta: {
    generatedAt: string;
    model?: string;
  }
}
// ---------------------------------------------------------------------------
// History & Database Record Types
// ---------------------------------------------------------------------------

/** Persisted wallet analysis record from the database. */
export interface WalletAnalysisRecord {
  id: string;
  userId: string;
  createdAt: string;
  summary: string;
  activityLevel: string;
  activityLevelRationale: string;
  dominantPatterns: BehaviorDetail[];
  tokenHabits: BehaviorDetail[];
  riskSignals: BehaviorDetail[];
  reflectionQuestions: string[];
  model: string | null;
  ethBalance: string | null;
}

/** Persisted token analysis record from the database. */
export interface TokenAnalysisRecord {
  id: string;
  userId: string;
  tokenAddress: string;
  createdAt: string;
  marketBrief: string;
  technicalPatterns: TechnicalPattern[];
  newsSummary: NewsItem[];
  sentiment: Sentiment;
  transferSizeMetrics: TransferSizeMetrics;
  behavioralInsights: TokenBehavioralInsights;
  model: string | null;
  ethBalance: string | null;
  marketDays: number | null;
}

/** Paginated meta shared across history responses. */
export interface PaginatedMeta {
  address: string;
  count: number;
  limit: number;
  offset: number;
  retrievedAt: string;
}

/** Response from GET /api/address/:walletAddress/history */
export interface WalletAnalysisHistoryResponse {
  success: boolean;
  analyses?: WalletAnalysisRecord[];
  error?: string;
  meta: PaginatedMeta;
}

/** Response from GET /api/address/:walletAddress/token/:tokenAddress/history */
export interface TokenAnalysisHistoryResponse {
  success: boolean;
  analyses?: TokenAnalysisRecord[];
  error?: string;
  meta: PaginatedMeta & { tokenAddress: string };
}

// ---------------------------------------------------------------------------
// Discord Types
// ---------------------------------------------------------------------------

/** Discord coaching session record from the database. */
export interface DiscordSession {
  id: string;
  userId: string;
  discordUserId: string;
  guildId: string | null;
  channelId: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  nudgesDelivered: string[] | null;
  topicsDiscussed: string[] | null;
  sessionSummary: string | null;
}

/** Response from GET /api/discord/status */
export interface DiscordStatusResponse {
  online: boolean;
  username: string | null;
  guilds: number;
}

/** Response from GET /api/discord/sessions/:walletAddress */
export interface DiscordSessionsResponse {
  success: boolean;
  sessions?: DiscordSession[];
  error?: string;
  meta: PaginatedMeta;
}

/** Response from GET /api/discord/sessions/:walletAddress/latest */
export interface DiscordLatestSessionResponse {
  success: boolean;
  session?: DiscordSession;
  error?: string;
  meta: { retrievedAt: string };
}

/** Response from POST /api/discord/start and POST /api/discord/stop */
export interface DiscordBotActionResponse {
  status: "ok" | "error";
  message: string;
}

/** Linked user info from GET /api/discord/user/:discordUserId */
export interface DiscordUserResponse {
  success: boolean;
  user?: {
    id: string;
    walletAddress: string;
    discordUserId: string | null;
    firstSeenAt: string;
    lastActiveAt: string;
  };
  hasActiveSession?: boolean;
  error?: string;
  meta: { retrievedAt: string };
}

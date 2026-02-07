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

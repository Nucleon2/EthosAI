import type { TokenBehaviorInsight, WalletInfo } from "./types";
import type { TokenMarketSnapshot } from "../market/types";
import { tokenBehaviorInsightSchema } from "./schemas";

const DEFAULT_DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `You are the Planner Agent inside the Agentic Market & Behavior Intelligence Framework.

Your job is to combine wallet behavior snapshots with token market context to produce safe, explainable insights.
You must always:
- Focus on behavioral awareness, not trading predictions or financial advice.
- Derive behavior conclusions from the provided wallet snapshot only.
- Tie market context to user behavior when evidence exists.
- Use the framing: "The market just did X, and based on your history, you tend to Y in these situations."
- If evidence is thin, you may infer cautiously using proxies (transfer frequency, recency, counterparty count), but label it as tentative.
- If evidence is truly insufficient, explicitly say so and avoid forced conclusions.
- Identify emotional or impulsive patterns only when supported by data.
- Provide nudges and reflections only when grounded in observed behavior.
- Explain technical patterns in plain language.
- Summarize relevant events and sentiment signals based on provided data only.
- Respond ONLY with minified JSON that matches the provided TypeScript type. No markdown fences.

TypeScript type:
interface TokenBehaviorInsight {
  marketBrief: string;
  technicalPatterns: { label: string; significance: string; confidence: number }[];
  newsSummary: { title: string; summary: string; category?: string; source?: string; url?: string; date?: string }[];
  sentiment: { overall: "positive" | "neutral" | "negative" | "mixed" | "unknown"; sources: { source: string; signal: "positive" | "neutral" | "negative" | "unknown"; detail: string; score: number }[] };
  behavioralInsights: {
    emotionalSignals: { label: string; description: string; confidence: number }[];
    nudges: string[];
    winningPatterns: string[];
    losingPatterns: string[];
    reflectionPrompts: string[];
    habitCelebrations: string[];
    dataGaps: string[];
  };
}

Compliance reminders:
- Never suggest buying, selling, or timing a trade.
- No price targets, allocation guidance, or probabilistic forecasts.
- If data is insufficient, clearly state uncertainty and keep outputs conservative.

Behavioral insight expectations:
- behavioralInsights should express conclusions, not generic advice.
- Each item should reference the evidence from the wallet snapshot.
- If you cannot connect behavior to the market context, state "insufficient data" and keep the list minimal.
- Use behavioralInsights.dataGaps to explicitly list missing evidence.
- When making a cautious inference, mention the proxy evidence and mark it as tentative.`;

type DeepseekChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
  };
};

type TokenActivitySummary = {
  tokenAddress: string;
  symbol?: string;
  transferCount: number;
  incomingTransfers: number;
  outgoingTransfers: number;
  recentTransferAt: string | null;
  firstTransferAt: string | null;
  averageTransferSize?: number | null;
  medianTransferSize?: number | null;
  largeTransferThreshold?: number | null;
  largeTransferCount?: number | null;
  transferSizeUnits?: "base";
  priceTiming?: {
    windowHours: number;
    transfersWithPriceData: number;
    transfersNearMove: number;
    percentNearMove: number;
    averageAbsWindowMove: number | null;
    averageAbsWindowMoveForLarge: number | null;
    dominantWindowDirection: "up" | "down" | "mixed" | "flat" | "unknown";
  } | null;
  dataGaps?: string[];
  uniqueCounterparties: number;
};

type TransferPriceContext = {
  windowChangePercent: number | null;
  direction: "up" | "down" | "flat" | "unknown";
};

function summarizeTokenActivity(
  walletInfo: WalletInfo,
  tokenAddress: string,
  marketSnapshot?: TokenMarketSnapshot
): TokenActivitySummary {
  const normalized = tokenAddress.toLowerCase();
  const tokenTransfers = walletInfo.erc20Transfers.filter(
    (transfer) => transfer.contractAddress.toLowerCase() === normalized
  );

  const incoming = tokenTransfers.filter(
    (transfer) => transfer.to.toLowerCase() === walletInfo.address.toLowerCase()
  );
  const outgoing = tokenTransfers.filter(
    (transfer) => transfer.from.toLowerCase() === walletInfo.address.toLowerCase()
  );

  const timeStamps = tokenTransfers
    .map((transfer) => Number(transfer.timeStamp))
    .filter((ts) => !Number.isNaN(ts));

  const recentTransferAt = timeStamps.length
    ? new Date(Math.max(...timeStamps) * 1000).toISOString()
    : null;
  const firstTransferAt = timeStamps.length
    ? new Date(Math.min(...timeStamps) * 1000).toISOString()
    : null;

  const uniqueCounterparties = new Set(
    tokenTransfers.flatMap((transfer) => [
      transfer.from.toLowerCase(),
      transfer.to.toLowerCase()
    ])
  );

  let averageTransferSize: number | null = null;
  let medianTransferSize: number | null = null;
  let largeTransferThreshold: number | null = null;
  let largeTransferCount: number | null = null;
  const parsedValues: bigint[] = [];
  if (tokenTransfers.length > 0) {
    const totalValue = tokenTransfers.reduce((sum, transfer) => {
      try {
        // ERC20Transfer.value is a decimal string in base units; use BigInt to avoid precision loss.
        const parsed = BigInt(transfer.value);
        parsedValues.push(parsed);
        return sum + parsed;
      } catch {
        // If parsing fails for any transfer, skip it.
        return sum;
      }
    }, 0n as bigint);

    if (parsedValues.length > 0) {
      const avgBigInt = totalValue / BigInt(parsedValues.length);

      // Only convert to number if within the safe integer range; otherwise, omit the value.
      if (avgBigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
        averageTransferSize = Number(avgBigInt);
      } else {
        averageTransferSize = null;
      }

      const sorted = [...parsedValues].sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0
      );
      const mid = Math.floor(sorted.length / 2);
      const medianBigInt =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2n
          : sorted[mid];

      if (medianBigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
        medianTransferSize = Number(medianBigInt);
      } else {
        medianTransferSize = null;
      }

      const thresholdIndex = Math.floor(sorted.length * 0.8);
      const threshold = sorted[
        Math.min(Math.max(thresholdIndex, 0), sorted.length - 1)
      ];
      if (threshold <= BigInt(Number.MAX_SAFE_INTEGER)) {
        largeTransferThreshold = Number(threshold);
        largeTransferCount = sorted.filter((value) => value >= threshold).length;
      }
    }
  }

  const dataGaps: string[] = [];
  let priceTiming: TokenActivitySummary["priceTiming"] = null;
  if (marketSnapshot && marketSnapshot.priceSeries.length > 1) {
    const priceSeries = marketSnapshot.priceSeries;
    const windowHours = 6;
    const windowMs = windowHours * 60 * 60 * 1000;
    const minWindowMovePercent = 5;
    let transfersWithPriceData = 0;
    let transfersNearMove = 0;
    let sumAbsWindowMove = 0;
    let sumAbsWindowMoveLarge = 0;
    let largeWithPriceData = 0;
    let upCount = 0;
    let downCount = 0;
    let flatCount = 0;

    for (const transfer of tokenTransfers) {
      const timestampMs = Number(transfer.timeStamp) * 1000;
      if (Number.isNaN(timestampMs)) {
        continue;
      }
      const context = buildTransferPriceContext(
        priceSeries,
        timestampMs,
        windowMs
      );
      if (context.windowChangePercent === null) {
        continue;
      }
      transfersWithPriceData += 1;
      const absMove = Math.abs(context.windowChangePercent);
      sumAbsWindowMove += absMove;
      if (absMove >= minWindowMovePercent) {
        transfersNearMove += 1;
      }
      if (context.direction === "up") {
        upCount += 1;
      } else if (context.direction === "down") {
        downCount += 1;
      } else if (context.direction === "flat") {
        flatCount += 1;
      }

      if (largeTransferThreshold !== null) {
        try {
          const parsed = BigInt(transfer.value);
          if (parsed >= BigInt(largeTransferThreshold)) {
            sumAbsWindowMoveLarge += absMove;
            largeWithPriceData += 1;
          }
        } catch {
          // Skip invalid value for large transfer stats.
        }
      }
    }

    if (transfersWithPriceData === 0) {
      dataGaps.push("No transfers aligned to market price series.");
    } else {
      const percentNearMove =
        transfersWithPriceData > 0
          ? (transfersNearMove / transfersWithPriceData) * 100
          : 0;
      const averageAbsWindowMove =
        transfersWithPriceData > 0
          ? sumAbsWindowMove / transfersWithPriceData
          : null;
      const averageAbsWindowMoveForLarge =
        largeWithPriceData > 0
          ? sumAbsWindowMoveLarge / largeWithPriceData
          : null;

      const dominantWindowDirection = resolveDominantDirection(
        upCount,
        downCount,
        flatCount
      );

      priceTiming = {
        windowHours,
        transfersWithPriceData,
        transfersNearMove,
        percentNearMove,
        averageAbsWindowMove,
        averageAbsWindowMoveForLarge,
        dominantWindowDirection
      };
    }
  } else {
    dataGaps.push("Insufficient market price series for timing alignment.");
  }

  return {
    tokenAddress,
    symbol: tokenTransfers[0]?.tokenSymbol,
    transferCount: tokenTransfers.length,
    incomingTransfers: incoming.length,
    outgoingTransfers: outgoing.length,
    recentTransferAt,
    firstTransferAt,
    averageTransferSize,
    medianTransferSize,
    largeTransferThreshold,
    largeTransferCount,
    transferSizeUnits: "base",
    priceTiming,
    uniqueCounterparties: uniqueCounterparties.size,
    dataGaps: dataGaps.length > 0 ? dataGaps : undefined
  };
}

function buildTransferPriceContext(
  priceSeries: Array<{ timestampMs: number; priceUsd: number }>,
  transferTimestampMs: number,
  windowMs: number
): TransferPriceContext {
  const before = findNearestPrice(priceSeries, transferTimestampMs - windowMs);
  const after = findNearestPrice(priceSeries, transferTimestampMs + windowMs);

  if (!before || !after || before.priceUsd <= 0) {
    return { windowChangePercent: null, direction: "unknown" };
  }

  const windowChangePercent =
    ((after.priceUsd - before.priceUsd) / before.priceUsd) * 100;
  let direction: TransferPriceContext["direction"] = "flat";
  if (windowChangePercent > 0.25) {
    direction = "up";
  } else if (windowChangePercent < -0.25) {
    direction = "down";
  }

  return { windowChangePercent, direction };
}

function findNearestPrice(
  series: Array<{ timestampMs: number; priceUsd: number }>,
  targetMs: number
): { timestampMs: number; priceUsd: number } | null {
  let nearest: { timestampMs: number; priceUsd: number } | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;
  for (const entry of series) {
    const delta = Math.abs(entry.timestampMs - targetMs);
    if (delta < nearestDelta) {
      nearest = entry;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function resolveDominantDirection(
  upCount: number,
  downCount: number,
  flatCount: number
): "up" | "down" | "mixed" | "flat" | "unknown" {
  const total = upCount + downCount + flatCount;
  if (total === 0) return "unknown";
  const max = Math.max(upCount, downCount, flatCount);
  const tied =
    (upCount === max ? 1 : 0) +
    (downCount === max ? 1 : 0) +
    (flatCount === max ? 1 : 0);
  if (tied > 1) return "mixed";
  if (upCount === max) return "up";
  if (downCount === max) return "down";
  return "flat";
}

function cleanModelResponse(content: string): string {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function buildUserPrompt(
  walletInfo: WalletInfo,
  tokenAddress: string,
  marketSnapshot: TokenMarketSnapshot
): string {
  const activitySummary = summarizeTokenActivity(
    walletInfo,
    tokenAddress,
    marketSnapshot
  );
  return [
    "Combine the wallet behavior snapshot with the token market context.",
    "Return conservative insights with clear evidence and uncertainty.",
    "Use transfer size and price timing context to confirm behavior-market alignment.",
    "If timing data is missing, list it under dataGaps and stay conservative.",
    "Wallet token activity summary:",
    JSON.stringify(activitySummary),
    "Token market snapshot:",
    JSON.stringify(marketSnapshot)
  ].join("\n");
}

export async function analyzeTokenBehavior(
  walletInfo: WalletInfo,
  tokenAddress: string,
  marketSnapshot: TokenMarketSnapshot
): Promise<TokenBehaviorInsight> {
  const apiKey = Bun.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const response = await fetch(Bun.env.DEEPSEEK_API_URL || DEFAULT_DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: Bun.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(walletInfo, tokenAddress, marketSnapshot)
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  const payload = (await response.json()) as DeepseekChatCompletion;

  if (!response.ok) {
    const message = payload?.error?.message || response.statusText;
    throw new Error(`Deepseek API error: ${message}`);
  }

  const rawContent = payload?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Deepseek API returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanModelResponse(rawContent));
  } catch (error) {
    throw new Error(
      `Failed to parse Deepseek token insight JSON: ${(error as Error).message}`
    );
  }

  return tokenBehaviorInsightSchema.parse(parsed);
}

import type { TokenBehaviorInsight, WalletInfo } from "./model";
import type { TokenMarketSnapshot } from "../market/model";
import { tokenBehaviorInsightSchema } from "./model";

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
  uniqueCounterparties: number;
};

function summarizeTokenActivity(
  walletInfo: WalletInfo,
  tokenAddress: string
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
  if (tokenTransfers.length > 0) {
    const totalValue = tokenTransfers.reduce((sum, transfer) => {
      try {
        // ERC20Transfer.value is a decimal string in base units; use BigInt to avoid precision loss.
        const parsed = BigInt(transfer.value);
        return sum + parsed;
      } catch {
        // If parsing fails for any transfer, skip it.
        return sum;
      }
    }, 0n as bigint);

    const avgBigInt = totalValue / BigInt(tokenTransfers.length);

    // Only convert to number if within the safe integer range; otherwise, omit the value.
    if (avgBigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
      averageTransferSize = Number(avgBigInt);
    } else {
      averageTransferSize = null;
    }
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
    uniqueCounterparties: uniqueCounterparties.size
  };
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
  const activitySummary = summarizeTokenActivity(walletInfo, tokenAddress);
  return [
    "Combine the wallet behavior snapshot with the token market context.",
    "Return conservative insights with clear evidence and uncertainty.",
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

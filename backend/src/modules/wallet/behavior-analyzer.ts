import type { WalletBehaviorInsight, WalletInfo } from "./model";
import { walletBehaviorInsightSchema } from "./model";

const DEFAULT_DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `You are the Planner Agent inside the Agentic Market & Behavior Intelligence Framework.

Your job is to examine Ethereum wallet activity summaries and infer explainable behavioral patterns.
You must always:
- Focus on behavioral awareness, not trading predictions or financial advice.
- Reference observable wallet data when describing habits or risks.
- Prefer conclusions grounded in evidence over generic advice.
- If evidence is insufficient, explicitly say so and avoid forced conclusions.
- Produce reflection questions only when they are grounded in observed behavior.
- Respond ONLY with minified JSON that matches the provided TypeScript type. No markdown fences.

TypeScript type:
interface WalletBehaviorInsight {
  summary: string;
  activityLevel: { level: "dormant" | "occasional" | "steady" | "active" | "high-frequency"; rationale: string };
  dominantPatterns: { label: string; description: string; confidence: number }[];
  tokenHabits: { label: string; description: string; confidence: number }[];
  riskSignals: { label: string; description: string; confidence: number }[];
  reflectionQuestions: string[];
}

Compliance reminders:
- Never suggest buying, selling, or timing a trade.
- No price targets, allocation guidance, or probabilistic forecasts.
- If data is insufficient, clearly state uncertainty and keep outputs conservative.`;

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

function summarizeWallet(info: WalletInfo) {
  const totalTransactions = info.transactions.length;
  const totalInternal = info.internalTransactions.length;
  const totalErc20 = info.erc20Transfers.length;
  const totalErc721 = info.erc721Transfers.length;

  const allTimestamps = [
    ...info.transactions.map((tx) => Number(tx.timeStamp)),
    ...info.internalTransactions.map((tx) => Number(tx.timeStamp)),
    ...info.erc20Transfers.map((tx) => Number(tx.timeStamp)),
    ...info.erc721Transfers.map((tx) => Number(tx.timeStamp))
  ].filter((ts) => !Number.isNaN(ts));

  const lastActive = allTimestamps.length
    ? new Date(Math.max(...allTimestamps) * 1000).toISOString()
    : null;

  const firstActive = allTimestamps.length
    ? new Date(Math.min(...allTimestamps) * 1000).toISOString()
    : null;

  const uniqueCounterparties = new Set(
    info.transactions.flatMap((tx) => [tx.from.toLowerCase(), tx.to.toLowerCase()])
  );

  const tokenUsage: Record<string, number> = {};
  for (const transfer of info.erc20Transfers) {
    const symbol = transfer.tokenSymbol || transfer.contractAddress;
    tokenUsage[symbol] = (tokenUsage[symbol] || 0) + 1;
  }

  const nftUsage: Record<string, number> = {};
  for (const transfer of info.erc721Transfers) {
    const symbol = transfer.tokenSymbol || transfer.contractAddress;
    nftUsage[symbol] = (nftUsage[symbol] || 0) + 1;
  }

  const topTokens = Object.entries(tokenUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topNfts = Object.entries(nftUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    address: info.address,
    balanceWei: info.balance,
    transactionCounts: {
      normal: totalTransactions,
      internal: totalInternal,
      erc20: totalErc20,
      erc721: totalErc721
    },
    uniqueCounterparties: uniqueCounterparties.size,
    topTokens,
    topNfts,
    firstActivity: firstActive,
    lastActivity: lastActive
  };
}

function buildUserPrompt(info: WalletInfo): string {
  const summary = summarizeWallet(info);
  return [
    "Analyze the following wallet snapshot and infer behavioral patterns.",
    "JSON snapshot:",
    JSON.stringify(summary)
  ].join("\n");
}

function cleanModelResponse(content: string): string {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function analyzeWalletBehavior(
  walletInfo: WalletInfo
): Promise<WalletBehaviorInsight> {
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
        { role: "user", content: buildUserPrompt(walletInfo) }
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
      `Failed to parse Deepseek behavior insight JSON: ${(error as Error).message}`
    );
  }

  return walletBehaviorInsightSchema.parse(parsed);
}

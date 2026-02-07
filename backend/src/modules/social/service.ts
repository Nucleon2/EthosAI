import type { TokenBehaviorInsight } from "../wallet/types";
import type { SocialPostsResult } from "./types";
import { llmSocialPostsOutputSchema } from "./schemas";

const DEFAULT_DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `You are a social media content writer for a crypto market intelligence tool called Derive AI.

Your job is to take a token market analysis and turn it into engaging social media posts for three platforms: Threads, X (Twitter), and LinkedIn.

RULES YOU MUST FOLLOW:
- Never use em dashes. Use commas, periods, or colons instead.
- Sound natural and human. Write like a real person who happens to be smart about crypto, not like a corporate AI.
- Never give financial advice. Never say "buy", "sell", "invest", or imply any trading action.
- Focus on behavioral observations, market context, and interesting patterns.
- Use the actual data from the analysis. Reference specific sentiment, patterns, or metrics when relevant.
- Do not make up data or statistics not present in the analysis.
- Keep things conversational and insightful, not hype-driven.
- Avoid generic crypto platitudes like "DYOR" or "NFA" unless it fits naturally.

PLATFORM-SPECIFIC GUIDELINES:

Threads:
- Casual and conversational tone
- Can use line breaks for readability
- 2-4 short paragraphs work well
- Hashtags are optional, use 1-2 max if they fit naturally
- Under 500 characters

X (Twitter):
- Must be under 280 characters total
- Punchy and concise
- Can use one hashtag if it fits
- Make it quotable and shareable

LinkedIn:
- Professional but approachable, not stuffy
- Can be longer, 2-3 paragraphs
- Focus on the analytical insight angle
- Frame it as market intelligence, not speculation
- Under 700 characters

You must respond with ONLY a minified JSON object matching this structure:
{"threads":"...","x":"...","linkedin":"..."}

No markdown fences. No explanation. Just the JSON.`;

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

/**
 * Cleans potential markdown fences from model JSON output.
 */
function cleanModelResponse(content: string): string {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

/**
 * Builds a concise user prompt from the token analysis data
 * that the LLM will use to generate social posts.
 */
function buildUserPrompt(
  tokenAnalysis: TokenBehaviorInsight,
  tokenAddress: string,
  tokenSymbol?: string
): string {
  const parts: string[] = [
    "Generate social media posts based on this token analysis.",
    "",
  ];

  if (tokenSymbol) {
    parts.push(`Token: ${tokenSymbol} (${tokenAddress})`);
  } else {
    parts.push(`Token contract: ${tokenAddress}`);
  }

  parts.push("");
  parts.push(`Market brief: ${tokenAnalysis.marketBrief}`);

  if (tokenAnalysis.sentiment) {
    parts.push(
      `Overall sentiment: ${tokenAnalysis.sentiment.overall}`
    );
    if (tokenAnalysis.sentiment.sources.length > 0) {
      const sourceDetails = tokenAnalysis.sentiment.sources
        .map((s) => `${s.source}: ${s.signal} (${s.detail})`)
        .join("; ");
      parts.push(`Sentiment sources: ${sourceDetails}`);
    }
  }

  if (tokenAnalysis.technicalPatterns.length > 0) {
    const patterns = tokenAnalysis.technicalPatterns
      .map((p) => `${p.label}: ${p.significance}`)
      .join("; ");
    parts.push(`Technical patterns: ${patterns}`);
  }

  const insights = tokenAnalysis.behavioralInsights;
  if (insights.nudges.length > 0) {
    parts.push(
      `Key behavioral nudges: ${insights.nudges.slice(0, 3).join("; ")}`
    );
  }
  if (insights.winningPatterns.length > 0) {
    parts.push(
      `Winning patterns: ${insights.winningPatterns.slice(0, 2).join("; ")}`
    );
  }

  return parts.join("\n");
}

/**
 * Generates social media posts for Threads, X, and LinkedIn
 * using the DeepSeek LLM based on token analysis data.
 */
export async function generateSocialPosts(
  tokenAnalysis: TokenBehaviorInsight,
  tokenAddress: string,
  tokenSymbol?: string
): Promise<SocialPostsResult> {
  const apiKey = Bun.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const userPrompt = buildUserPrompt(
    tokenAnalysis,
    tokenAddress,
    tokenSymbol
  );

  const response = await fetch(
    Bun.env.DEEPSEEK_API_URL || DEFAULT_DEEPSEEK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: Bun.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    }
  );

  const payload = (await response.json()) as DeepseekChatCompletion;

  if (!response.ok) {
    const message = payload?.error?.message || response.statusText;
    throw new Error(`DeepSeek API error: ${message}`);
  }

  const rawContent = payload?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("DeepSeek returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanModelResponse(rawContent));
  } catch (error) {
    throw new Error(
      `Failed to parse social posts JSON: ${(error as Error).message}`
    );
  }

  const validated = llmSocialPostsOutputSchema.parse(parsed);

  return {
    threads: { platform: "threads", content: validated.threads },
    x: { platform: "x", content: validated.x },
    linkedin: { platform: "linkedin", content: validated.linkedin },
  };
}

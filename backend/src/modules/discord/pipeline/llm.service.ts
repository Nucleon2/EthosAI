import { buildCoachSystemPrompt } from "../coach-prompt";
import { databaseService } from "../../database";

const DEFAULT_DEEPSEEK_URL =
  "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

type DeepseekStreamChunk = {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
};

/**
 * Behavioral coach LLM service -- sends user utterances to DeepSeek
 * with wallet context from the database.
 *
 * Streams the response back via a callback for real-time TTS piping.
 *
 * Optionally accepts a token address to focus the coaching session
 * on a specific token's behavioral analysis.
 */
export class LlmService {
  private conversationHistory: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];
  private walletAddress: string;
  private tokenAddress?: string;
  private systemPromptLoaded = false;

  constructor(walletAddress: string, tokenAddress?: string) {
    this.walletAddress = walletAddress;
    this.tokenAddress = tokenAddress;
  }

  /**
   * Loads wallet context from DB and builds the system prompt.
   * If a token address was provided, includes that token's
   * analysis as the primary focus.
   *
   * Called once at session start.
   */
  async initialize(): Promise<void> {
    const walletAnalysis =
      await databaseService.getLatestWalletAnalysis(
        this.walletAddress
      );

    // If a specific token was requested, prioritize its analysis
    let tokenAnalyses;
    if (this.tokenAddress) {
      const focusedAnalysis =
        await databaseService.getLatestTokenAnalysis(
          this.walletAddress,
          this.tokenAddress
        );
      const otherAnalyses =
        await databaseService.getAllRecentTokenAnalyses(
          this.walletAddress,
          4
        );
      tokenAnalyses = focusedAnalysis
        ? [focusedAnalysis, ...otherAnalyses]
        : otherAnalyses;
    } else {
      tokenAnalyses =
        await databaseService.getAllRecentTokenAnalyses(
          this.walletAddress,
          5
        );
    }

    const systemPrompt = buildCoachSystemPrompt(
      this.walletAddress,
      walletAnalysis,
      tokenAnalyses,
      this.tokenAddress
    );

    this.conversationHistory = [
      { role: "system", content: systemPrompt },
    ];
    this.systemPromptLoaded = true;
  }

  /**
   * Sends a user utterance to the LLM and streams the response.
   *
   * @param text - Transcribed user speech
   * @param onChunk - Called with each text chunk as it streams in
   * @param onDone - Called when the full response is complete
   */
  async respond(
    text: string,
    onChunk: (chunk: string) => void,
    onDone: (fullResponse: string) => void
  ): Promise<void> {
    if (!this.systemPromptLoaded) {
      await this.initialize();
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "DEEPSEEK_API_KEY environment variable is not set"
      );
    }

    this.conversationHistory.push({
      role: "user",
      content: text,
    });

    const response = await fetch(
      process.env.DEEPSEEK_API_URL || DEFAULT_DEEPSEEK_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:
            process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
          messages: this.conversationHistory,
          temperature: 0.6,
          max_tokens: 300,
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      // Remove the user message we just added since LLM failed
      this.conversationHistory.pop();
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}`
      );
    }

    let fullResponse = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed =
            JSON.parse(data) as DeepseekStreamChunk;
          const content =
            parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    this.conversationHistory.push({
      role: "assistant",
      content: fullResponse,
    });

    // Keep conversation history manageable (system + last 20 turns)
    if (this.conversationHistory.length > 21) {
      this.conversationHistory = [
        this.conversationHistory[0],
        ...this.conversationHistory.slice(-20),
      ];
    }

    onDone(fullResponse);
  }

  /**
   * Returns the conversation history (for session summary).
   */
  getHistory(): Array<{ role: string; content: string }> {
    return this.conversationHistory.filter(
      (m) => m.role !== "system"
    );
  }
}

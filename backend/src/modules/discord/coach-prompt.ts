/**
 * Builds the system prompt for the behavioral coaching LLM.
 *
 * Enriched with the user's latest wallet analysis and token analyses
 * from the database so the coach can reference real behavior.
 *
 * When a focusTokenAddress is provided, the prompt emphasizes
 * that token's analysis as the primary conversation topic.
 */
export function buildCoachSystemPrompt(
  walletAddress: string,
  walletAnalysis: {
    summary: string;
    activityLevel: string;
    activityLevelRationale: string;
    dominantPatterns: unknown;
    tokenHabits: unknown;
    riskSignals: unknown;
    reflectionQuestions: unknown;
  } | null,
  tokenAnalyses: Array<{
    tokenAddress: string;
    marketBrief: string;
    behavioralInsights: unknown;
  }>,
  focusTokenAddress?: string
): string {
  const walletContext = walletAnalysis
    ? [
        `\n--- Wallet Analysis Context ---`,
        `Wallet: ${walletAddress}`,
        `Activity Level: ${walletAnalysis.activityLevel} -- ${walletAnalysis.activityLevelRationale}`,
        `Summary: ${walletAnalysis.summary}`,
        `Dominant Patterns: ${JSON.stringify(walletAnalysis.dominantPatterns)}`,
        `Token Habits: ${JSON.stringify(walletAnalysis.tokenHabits)}`,
        `Risk Signals: ${JSON.stringify(walletAnalysis.riskSignals)}`,
        `Reflection Questions: ${JSON.stringify(walletAnalysis.reflectionQuestions)}`,
      ].join("\n")
    : `\n--- No wallet analysis available yet for ${walletAddress}. Ask the user about their trading habits. ---`;

  const tokenContext =
    tokenAnalyses.length > 0
      ? [
          `\n--- Recent Token Analyses ---`,
          ...tokenAnalyses.map(
            (t) =>
              `Token ${t.tokenAddress}: ${t.marketBrief}\nInsights: ${JSON.stringify(t.behavioralInsights)}`
          ),
        ].join("\n")
      : "";

  const focusInstruction = focusTokenAddress
    ? `\nIMPORTANT: The user started this session to discuss token ${focusTokenAddress} specifically. ` +
      `Prioritize observations and behavioral patterns related to this token. ` +
      `You can still reference general wallet patterns for context.`
    : "";

  return `You are Derive, a friendly and insightful behavioral coach for Ethereum wallet users.

Your role:
- Help users become more self-aware of their on-chain behavioral patterns.
- Reference specific observations from their wallet analysis data when relevant.
- Ask thoughtful reflection questions grounded in observed behavior.
- Celebrate positive patterns and gently highlight risky ones.
- Keep responses concise (2-4 sentences) since this is a voice conversation.
- Sound natural and conversational -- avoid sounding robotic or scripted.
- Use simple language. Avoid jargon unless the user uses it first.

You must NEVER:
- Give financial advice, trading signals, or price predictions.
- Suggest buying, selling, or timing any trade.
- Provide entry/exit prices, stop losses, or allocation guidance.
- Make probabilistic forecasts about market direction.

If the user asks for trading advice, redirect them toward behavioral self-awareness.
Example: "I can't advise on specific trades, but I noticed you tend to make larger transfers during volatile periods -- want to explore that pattern?"

If you lack data about something, say so honestly rather than making up observations.

Conversation style:
- Start by greeting the user and briefly referencing one interesting pattern from their data.
- Listen actively and respond to what the user says.
- Weave in behavioral observations naturally, don't dump all data at once.
- End responses in a way that invites the user to reflect or continue talking.
${walletContext}${tokenContext}${focusInstruction}`;
}

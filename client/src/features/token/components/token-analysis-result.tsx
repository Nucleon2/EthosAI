/**
 * TokenAnalysisResult - Displays a comprehensive summary of the token
 * analysis including market brief, balance info, behavioral insights,
 * technical patterns, sentiment sources, and news.
 */

import { useState } from "react";
import {
  RiCloseLine,
  RiSparklingLine,
  RiShareLine,
  RiWallet3Line,
  RiCoinLine,
  RiTrophyLine,
  RiAlertLine,
  RiEmotionLine,
  RiBarChartLine,
  RiNewspaperLine,
  RiErrorWarningLine,
  RiThumbUpLine,
} from "@remixicon/react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialShareModal } from "@/features/social";
import type { TokenAnalysis, TokenAnalysisMeta } from "@/types/api";

/**
 * Formats a number as a compact USD string (e.g. "$1,234.56").
 * Falls back to "--" when the value is null/undefined.
 */
function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a numeric string or number to a readable token amount.
 * Uses up to 6 decimal places and strips trailing zeros.
 */
function formatTokenAmount(value: string | null | undefined): string {
  if (value === null || value === undefined) return "--";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "--";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

interface TokenAnalysisResultProps {
  analysis: TokenAnalysis;
  tokenAddress: string;
  meta?: TokenAnalysisMeta | null;
  onClear: () => void;
}

export function TokenAnalysisResult({
  analysis,
  tokenAddress,
  meta,
  onClear,
}: TokenAnalysisResultProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);

  return (
    <>
      <BlurFade delay={0.1} duration={0.5}>
        <div className="w-full space-y-4 border-t border-border pt-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiSparklingLine className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Analysis Complete
              </span>
            </div>
            <button
              onClick={onClear}
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>

          {/* Balance & Price Overview */}
          {meta && (
            <div className="grid grid-cols-2 gap-3">
              {/* ETH Balance */}
              <div className="flex flex-col gap-1 rounded border border-border bg-muted/30 p-2.5">
                <div className="flex items-center gap-1.5">
                  <RiWallet3Line className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    ETH Balance
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatTokenAmount(meta.balance)} ETH
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatUsd(meta.ethBalanceUsd)}
                </span>
              </div>

              {/* Token Holdings */}
              <div className="flex flex-col gap-1 rounded border border-border bg-muted/30 p-2.5">
                <div className="flex items-center gap-1.5">
                  <RiCoinLine className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {meta.tokenSymbol?.toUpperCase() ?? "Token"} Holdings
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatTokenAmount(meta.tokenBalance)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatUsd(meta.tokenBalanceUsd)}
                </span>
              </div>

              {/* Token Price - full width */}
              {meta.tokenPriceUsd !== null && meta.tokenPriceUsd !== undefined && (
                <div className="col-span-2 flex items-center justify-between rounded border border-border bg-muted/30 px-2.5 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {meta.tokenName ?? "Token"} Price
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatUsd(meta.tokenPriceUsd)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Market brief */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {analysis.marketBrief}
          </p>

          {/* Sentiment badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sentiment:</span>
            <Badge
              variant={
                analysis.sentiment.overall === "positive"
                  ? "default"
                  : "secondary"
              }
              className="text-[10px] capitalize"
            >
              {analysis.sentiment.overall}
            </Badge>
          </div>

          {/* Nudges */}
          {analysis.behavioralInsights.nudges.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">
                Behavioral Nudges
              </span>
              <ul className="space-y-1.5">
                {analysis.behavioralInsights.nudges.slice(0, 3).map((nudge, i) => (
                  <li
                    key={i}
                    className="text-xs leading-relaxed text-muted-foreground pl-3 border-l-2 border-primary/30"
                  >
                    {nudge}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reflection prompts */}
          {analysis.behavioralInsights.reflectionPrompts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">
                Reflection
              </span>
              <ul className="space-y-1">
                {analysis.behavioralInsights.reflectionPrompts
                  .slice(0, 2)
                  .map((prompt, i) => (
                    <li
                      key={i}
                      className="text-xs italic text-muted-foreground"
                    >
                      &ldquo;{prompt}&rdquo;
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Winning Patterns */}
          {analysis.behavioralInsights.winningPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiTrophyLine className="size-3.5 text-green-500" />
                <span className="text-xs font-medium text-foreground">
                  Winning Patterns
                </span>
              </div>
              <ul className="space-y-1.5">
                {analysis.behavioralInsights.winningPatterns.map((pattern, i) => (
                  <li
                    key={i}
                    className="text-xs leading-relaxed text-muted-foreground pl-3 border-l-2 border-green-500/40"
                  >
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Habit Celebrations */}
          {analysis.behavioralInsights.habitCelebrations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiThumbUpLine className="size-3.5 text-green-500" />
                <span className="text-xs font-medium text-foreground">
                  Habit Celebrations
                </span>
              </div>
              <ul className="space-y-1.5">
                {analysis.behavioralInsights.habitCelebrations.map((celebration, i) => (
                  <li
                    key={i}
                    className="text-xs leading-relaxed text-green-700 dark:text-green-400 pl-3 border-l-2 border-green-500/40 bg-green-500/5 py-1 pr-2 rounded-r"
                  >
                    {celebration}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Losing Patterns */}
          {analysis.behavioralInsights.losingPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiAlertLine className="size-3.5 text-amber-500" />
                <span className="text-xs font-medium text-foreground">
                  Patterns to Watch
                </span>
              </div>
              <ul className="space-y-1.5">
                {analysis.behavioralInsights.losingPatterns.map((pattern, i) => (
                  <li
                    key={i}
                    className="text-xs leading-relaxed text-muted-foreground pl-3 border-l-2 border-amber-500/40"
                  >
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Emotional Signals */}
          {analysis.behavioralInsights.emotionalSignals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiEmotionLine className="size-3.5 text-violet-500" />
                <span className="text-xs font-medium text-foreground">
                  Emotional Signals
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.behavioralInsights.emotionalSignals.map((signal, i) => (
                  <li key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {signal.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(signal.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground pl-3 border-l-2 border-violet-500/30">
                      {signal.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Patterns */}
          {analysis.technicalPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiBarChartLine className="size-3.5 text-blue-500" />
                <span className="text-xs font-medium text-foreground">
                  Technical Patterns
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.technicalPatterns.map((pattern, i) => (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {pattern.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pattern.significance}
                    </p>
                    {/* Confidence bar */}
                    <div className="h-1 w-full rounded-full bg-muted">
                      <div
                        className="h-1 rounded-full bg-blue-500/60"
                        style={{ width: `${Math.round(pattern.confidence * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sentiment Sources */}
          {analysis.sentiment.sources.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">
                Sentiment Sources
              </span>
              <ul className="space-y-1.5">
                {analysis.sentiment.sources.map((src, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-foreground">
                        {src.source}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}&mdash; {src.detail}
                      </span>
                    </div>
                    <Badge
                      variant={
                        src.signal === "positive"
                          ? "default"
                          : src.signal === "negative"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] capitalize shrink-0"
                    >
                      {src.signal}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* News Summary */}
          {analysis.newsSummary.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiNewspaperLine className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  News & Updates
                </span>
              </div>
              <ul className="space-y-2.5">
                {analysis.newsSummary.map((item, i) => (
                  <li key={i} className="space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-foreground leading-snug">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-primary transition-colors"
                          >
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )}
                      </span>
                      {item.category && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    {(item.source || item.date) && (
                      <p className="text-[10px] text-muted-foreground/60">
                        {[item.source, item.date].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Gaps */}
          {analysis.behavioralInsights.dataGaps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiErrorWarningLine className="size-3.5 text-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground">
                  Data Gaps
                </span>
              </div>
              <ul className="space-y-1">
                {analysis.behavioralInsights.dataGaps.map((gap, i) => (
                  <li
                    key={i}
                    className="text-[11px] leading-relaxed text-muted-foreground/70 pl-3 border-l border-border"
                  >
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Share on social media */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShareModalOpen(true)}
            >
              <RiShareLine className="size-3.5" data-icon="inline-start" />
              Share on Social Media
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* Social share modal */}
      <SocialShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        tokenAnalysis={analysis}
        tokenAddress={tokenAddress}
      />
    </>
  );
}

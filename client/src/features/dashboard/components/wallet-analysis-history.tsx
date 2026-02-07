/**
 * WalletAnalysisHistory - Lists past wallet analyses from the database.
 * Each entry is expandable to show full behavioral insights and market data.
 *
 * Uses the useWalletHistory hook for infinite-query "load more" pagination.
 */

import { useState } from "react";
import {
  RiCoinLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiTimeLine,
  RiSparklingLine,
  RiLoader4Line,
  RiRefreshLine,
  RiAlertLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { useWalletHistory } from "@/hooks/use-wallet-history";

interface WalletAnalysisHistoryProps {
  walletAddress: string;
}

/** Formats an ISO date string to a readable short format. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WalletAnalysisHistory({
  walletAddress,
}: WalletAnalysisHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    analyses,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useWalletHistory(walletAddress);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiTimeLine className="size-4 text-primary" />
            <CardTitle>Analysis History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            onClick={refresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiRefreshLine className="size-3" />
            )}
            Refresh
          </Button>
        </div>
        <CardDescription>
          Previously computed wallet behavioral analyses
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && analyses.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <RiCoinLine className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No past analyses found. Run an analysis from the home page to see
              results here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {analyses.map((analysis, i) => {
              const isExpanded = expandedId === analysis.id;
              return (
                <BlurFade key={analysis.id} delay={i * 0.03} duration={0.3}>
                  <div className="border border-border">
                    {/* Summary row */}
                    <button
                      onClick={() => toggleExpand(analysis.id)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                      type="button"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <RiSparklingLine className="size-3.5 shrink-0 text-primary" />
                        <span className="text-xs font-medium text-foreground truncate">
                          {analysis.summary.slice(0, 80)}
                          {analysis.summary.length > 80 ? "..." : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          {analysis.activityLevel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(analysis.createdAt)}
                        </span>
                        {isExpanded ? (
                          <RiArrowUpSLine className="size-3.5 text-muted-foreground" />
                        ) : (
                          <RiArrowDownSLine className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded ? (
                      <div className="border-t border-border px-3 py-3 space-y-3">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {analysis.summary}
                        </p>

                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Activity:
                          </span>{" "}
                          {analysis.activityLevelRationale}
                        </p>

                        {analysis.dominantPatterns.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-medium text-foreground">
                              Patterns
                            </span>
                            {analysis.dominantPatterns.map((p, j) => (
                              <div
                                key={j}
                                className="text-[11px] text-muted-foreground pl-2 border-l-2 border-primary/20"
                              >
                                <span className="font-medium text-foreground">
                                  {p.label}
                                </span>{" "}
                                &mdash; {p.description}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Token Habits */}
                        {analysis.tokenHabits.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-medium text-foreground">
                              Token Habits
                            </span>
                            {analysis.tokenHabits.map((h, j) => (
                              <div
                                key={j}
                                className="text-[11px] text-muted-foreground pl-2 border-l-2 border-blue-500/20"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground">
                                    {h.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {Math.round(h.confidence * 100)}%
                                  </span>
                                </div>
                                <span>{h.description}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Risk Signals */}
                        {analysis.riskSignals.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <RiAlertLine className="size-3 text-amber-500" />
                              <span className="text-[11px] font-medium text-foreground">
                                Risk Signals
                              </span>
                            </div>
                            {analysis.riskSignals.map((r, j) => (
                              <div
                                key={j}
                                className="text-[11px] text-muted-foreground pl-2 border-l-2 border-amber-500/20"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground">
                                    {r.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {Math.round(r.confidence * 100)}%
                                  </span>
                                </div>
                                <span>{r.description}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {analysis.reflectionQuestions.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-medium text-foreground">
                              Reflections
                            </span>
                            {analysis.reflectionQuestions.map((q, j) => (
                              <p
                                key={j}
                                className="text-[11px] italic text-muted-foreground pl-2 border-l-2 border-muted"
                              >
                                &ldquo;{q}&rdquo;
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {/* Footer: ETH balance & model */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          {analysis.ethBalance ? (
                            <p className="text-[10px] text-muted-foreground/60">
                              ETH balance at time of analysis:{" "}
                              {analysis.ethBalance} ETH
                            </p>
                          ) : (
                            <span />
                          )}
                          {analysis.model ? (
                            <div className="flex items-center gap-1">
                              <RiShieldKeyholeLine className="size-2.5 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/40">
                                {analysis.model}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </BlurFade>
              );
            })}

            {/* Load more button */}
            {hasMore && (
              <div className="pt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-muted-foreground"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RiLoader4Line className="size-3 animate-spin mr-1" />
                  ) : null}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

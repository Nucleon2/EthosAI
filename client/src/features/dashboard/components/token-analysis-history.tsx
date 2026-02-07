/**
 * TokenAnalysisHistory - Lists past token analyses from the database.
 * Each entry is expandable to show full behavioral insights and market data.
 *
 * Uses TanStack Query for data fetching, sharing cache with useWalletHistory.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RiCoinLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiTimeLine,
  RiSparklingLine,
  RiLoader4Line,
  RiRefreshLine,
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
import { getWalletAnalysisHistory } from "@/services/api";
import { queryKeys } from "@/lib/query-client";
import type { WalletAnalysisRecord } from "@/types/api";

interface TokenAnalysisHistoryProps {
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

export function TokenAnalysisHistory({
  walletAddress,
}: TokenAnalysisHistoryProps) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.wallet.history(walletAddress), "component", 20],
    queryFn: () => getWalletAnalysisHistory(walletAddress, 20, 0),
  });

  const analyses: WalletAnalysisRecord[] =
    query.data?.success && query.data.analyses ? query.data.analyses : [];

  const isLoading = query.isLoading || query.isFetching;

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : "An unexpected error occurred"
    : query.data && !query.data.success
      ? (query.data.error ?? "Failed to load history")
      : null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.history(walletAddress),
    });
  };

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
            onClick={handleRefresh}
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
                                — {p.description}
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

                        {analysis.ethBalance ? (
                          <p className="text-[10px] text-muted-foreground/60">
                            ETH balance at time of analysis:{" "}
                            {analysis.ethBalance} ETH
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </BlurFade>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

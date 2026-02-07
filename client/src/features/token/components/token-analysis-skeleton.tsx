/**
 * TokenAnalysisSkeleton - Displays a structured placeholder that mirrors
 * the TokenAnalysisResult layout while the analysis is in progress.
 * Provides better perceived performance than a simple text spinner.
 */

import { RiSparklingLine } from "@remixicon/react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Skeleton } from "@/components/ui/skeleton";

export function TokenAnalysisSkeleton() {
  return (
    <BlurFade delay={0.05} duration={0.4}>
      <div className="w-full space-y-4 border-t border-border pt-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <RiSparklingLine className="size-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground animate-pulse">
            Analyzing...
          </span>
        </div>

        {/* Balance & Price cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* ETH Balance card */}
          <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          {/* Token Holdings card */}
          <div className="flex flex-col gap-2 rounded border border-border bg-muted/30 p-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          {/* Token Price row */}
          <div className="col-span-2 flex items-center justify-between rounded border border-border bg-muted/30 px-2.5 py-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Market brief paragraph */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Sentiment badge */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Behavioral nudges */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <div className="space-y-1.5">
            <div className="pl-3 border-l-2 border-primary/10">
              <Skeleton className="h-3 w-full" />
            </div>
            <div className="pl-3 border-l-2 border-primary/10">
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </div>

        {/* Reflection */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>

        {/* Technical patterns */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1 w-full rounded-full" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-1 w-full rounded-full" />
            </div>
          </div>
        </div>

        {/* Share button placeholder */}
        <div className="pt-2">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </BlurFade>
  );
}

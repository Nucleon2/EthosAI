/**
 * WalletInsightCard - Renders the full wallet behavioral insight.
 * Displays summary, activity level, dominant patterns, token habits,
 * risk signals, and reflection questions from the Zustand store.
 */

import {
  RiBrainLine,
  RiPulseLine,
  RiAlertLine,
  RiQuestionLine,
  RiCoinLine,
  RiBarChartBoxLine,
} from "@remixicon/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BlurFade } from "@/components/ui/blur-fade";
import type { WalletBehaviorInsight } from "@/types/api";
import { cn } from "@/lib/utils";

interface WalletInsightCardProps {
  insight: WalletBehaviorInsight;
  walletAddress: string;
}

/** Maps activity level to a color class and progress value. */
const ACTIVITY_LEVELS = {
  dormant: { color: "text-muted-foreground", progress: 10 },
  occasional: { color: "text-yellow-600", progress: 30 },
  steady: { color: "text-blue-600", progress: 50 },
  active: { color: "text-green-600", progress: 75 },
  "high-frequency": { color: "text-primary", progress: 100 },
} as const;

/** Truncates an Ethereum address for display. */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletInsightCard({
  insight,
  walletAddress,
}: WalletInsightCardProps) {
  const activityMeta = ACTIVITY_LEVELS[insight.activityLevel.level];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiBrainLine className="size-4 text-primary" />
            <CardTitle>Wallet Behavioral Insight</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {truncateAddress(walletAddress)}
          </Badge>
        </div>
        <CardDescription>{insight.summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Activity Level */}
        <BlurFade delay={0.05} duration={0.4}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RiPulseLine className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Activity Level
                </span>
              </div>
              <Badge
                variant="secondary"
                className={cn("text-[10px] capitalize", activityMeta.color)}
              >
                {insight.activityLevel.level}
              </Badge>
            </div>
            <Progress value={activityMeta.progress} className="h-1" />
            <p className="text-[11px] text-muted-foreground">
              {insight.activityLevel.rationale}
            </p>
          </div>
        </BlurFade>

        {/* Dominant Patterns */}
        {insight.dominantPatterns.length > 0 && (
          <BlurFade delay={0.1} duration={0.4}>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiBarChartBoxLine className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Dominant Patterns
                </span>
              </div>
              <div className="space-y-2">
                {insight.dominantPatterns.map((pattern, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-primary/30 pl-3 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {pattern.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {pattern.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        )}

        {/* Token Habits */}
        {insight.tokenHabits.length > 0 && (
          <BlurFade delay={0.15} duration={0.4}>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiCoinLine className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Token Habits
                </span>
              </div>
              <div className="space-y-2">
                {insight.tokenHabits.map((habit, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-chart-2/30 pl-3 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {habit.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(habit.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {habit.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        )}

        {/* Risk Signals */}
        {insight.riskSignals.length > 0 && (
          <BlurFade delay={0.2} duration={0.4}>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiAlertLine className="size-3.5 text-destructive" />
                <span className="text-xs font-medium text-foreground">
                  Risk Signals
                </span>
              </div>
              <div className="space-y-2">
                {insight.riskSignals.map((signal, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-destructive/30 pl-3 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {signal.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(signal.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {signal.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        )}

        {/* Reflection Questions */}
        {insight.reflectionQuestions.length > 0 && (
          <BlurFade delay={0.25} duration={0.4}>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RiQuestionLine className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Reflection Questions
                </span>
              </div>
              <ul className="space-y-1.5">
                {insight.reflectionQuestions.map((question, i) => (
                  <li
                    key={i}
                    className="text-[11px] italic text-muted-foreground pl-3 border-l-2 border-muted"
                  >
                    &ldquo;{question}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          </BlurFade>
        )}
      </CardContent>
    </Card>
  );
}

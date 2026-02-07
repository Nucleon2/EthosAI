/**
 * TokenAnalysisResult - Displays a brief summary of the token analysis.
 * Shows the market brief and key behavioral nudges from the analysis.
 */

import { RiCloseLine, RiSparklingLine } from "@remixicon/react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import type { TokenAnalysis } from "@/types/api";

interface TokenAnalysisResultProps {
  analysis: TokenAnalysis;
  onClear: () => void;
}

export function TokenAnalysisResult({
  analysis,
  onClear,
}: TokenAnalysisResultProps) {
  return (
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
      </div>
    </BlurFade>
  );
}

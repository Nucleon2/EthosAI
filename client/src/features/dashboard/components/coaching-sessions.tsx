/**
 * CoachingSessions - Displays Discord coaching session history.
 * Shows session summaries, topics discussed, and nudges delivered.
 */

import {
  RiMicLine,
  RiTimeLine,
  RiCheckLine,
  RiPlayCircleLine,
  RiLoader4Line,
  RiRefreshLine,
  RiChatVoiceLine,
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
import { useDiscordSessions } from "@/hooks/use-discord-sessions";
import type { DiscordSession } from "@/types/api";
import { cn } from "@/lib/utils";

interface CoachingSessionsProps {
  walletAddress: string;
}

/** Formats an ISO date string to a readable format. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Calculates session duration in a human-readable format. */
function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

/** Returns status badge variant and label. */
function getStatusMeta(status: string): {
  variant: "default" | "secondary" | "destructive" | "outline";
  label: string;
} {
  switch (status) {
    case "active":
      return { variant: "default", label: "Active" };
    case "completed":
      return { variant: "secondary", label: "Completed" };
    case "ended":
      return { variant: "secondary", label: "Ended" };
    default:
      return { variant: "outline", label: status };
  }
}

function SessionItem({
  session,
  index,
}: {
  session: DiscordSession;
  index: number;
}) {
  const statusMeta = getStatusMeta(session.status);
  const isActive = session.status === "active";

  return (
    <BlurFade delay={index * 0.03} duration={0.3}>
      <div
        className={cn(
          "border border-border p-3 space-y-2.5 min-w-0",
          isActive && "border-primary/30 bg-primary/[0.02]"
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isActive ? (
              <RiPlayCircleLine className="size-3.5 text-primary animate-pulse" />
            ) : (
              <RiCheckLine className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-foreground">
              Coaching Session
            </span>
            <Badge
              variant={statusMeta.variant}
              className="text-[10px]"
            >
              {statusMeta.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <RiTimeLine className="size-3" />
            <span>{formatDuration(session.startedAt, session.endedAt)}</span>
          </div>
        </div>

        {/* Session summary */}
        {session.sessionSummary && (
          <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
            {session.sessionSummary}
          </p>
        )}

        {/* Topics discussed */}
        {session.topicsDiscussed && session.topicsDiscussed.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {session.topicsDiscussed.map((topic, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] font-normal h-auto whitespace-normal text-left"
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {/* Nudges delivered */}
        {session.nudgesDelivered && session.nudgesDelivered.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-foreground">
              Nudges delivered
            </span>
            {session.nudgesDelivered.slice(0, 3).map((nudge, i) => (
              <p
                key={i}
                className="text-[11px] text-muted-foreground pl-2 border-l-2 border-primary/20 break-words"
              >
                {nudge}
              </p>
            ))}
            {session.nudgesDelivered.length > 3 && (
              <p className="text-[10px] text-muted-foreground/60 pl-2">
                +{session.nudgesDelivered.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground/60">
          {formatDate(session.startedAt)}
        </p>
      </div>
    </BlurFade>
  );
}

export function CoachingSessions({
  walletAddress,
}: CoachingSessionsProps) {
  const {
    sessions,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useDiscordSessions(walletAddress);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiMicLine className="size-4 text-primary" />
            <CardTitle>Coaching Sessions</CardTitle>
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
          Voice coaching sessions from the Discord bot
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && sessions.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <RiChatVoiceLine className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No coaching sessions found. Start a session with the
              Discord bot using the /coach command.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, i) => (
              <SessionItem
                key={session.id}
                session={session}
                index={i}
              />
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[10px]"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RiLoader4Line className="size-3 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

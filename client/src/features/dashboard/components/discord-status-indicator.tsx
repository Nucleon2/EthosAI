/**
 * DiscordStatusIndicator - Live polling indicator showing
 * whether the Discord coaching bot is online.
 * Polls every 10 seconds via the useDiscordStatus hook.
 */

import { RiDiscordLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscordStatus } from "@/hooks/use-discord-status";
import { cn } from "@/lib/utils";

export function DiscordStatusIndicator() {
  const { status, isLoading, error } = useDiscordStatus();

  if (isLoading) {
    return <Skeleton className="h-7 w-36" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5">
        <RiDiscordLine className="size-4 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          Bot status unavailable
        </span>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="flex items-center gap-2">
      <RiDiscordLine
        className={cn(
          "size-4",
          status.online ? "text-[#5865F2]" : "text-muted-foreground"
        )}
      />
      <div className="flex items-center gap-1.5">
        {/* Pulsing dot for online status */}
        <span
          className={cn(
            "inline-block size-1.5 rounded-full",
            status.online
              ? "bg-green-500 animate-pulse"
              : "bg-muted-foreground/40"
          )}
        />
        <span className="text-[11px] text-foreground font-medium">
          {status.online ? "Bot Online" : "Bot Offline"}
        </span>
      </div>
      {status.online && status.username && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {status.username}
        </Badge>
      )}
      {status.online && status.guilds > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {status.guilds} {status.guilds === 1 ? "server" : "servers"}
        </span>
      )}
    </div>
  );
}

/**
 * DiscordStatusIndicator - Live polling indicator showing
 * whether the Discord coaching bot is online, with a toggle
 * button to start or stop the bot.
 *
 * Polls every 10 seconds normally, or every 2 seconds while
 * the bot is in the "connecting" state.
 */

import { RiDiscordLine, RiLoader4Line } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscordStatus } from "@/hooks/use-discord-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DiscordStatusIndicator() {
  const {
    status,
    isLoading,
    isToggling,
    isConnecting,
    error,
    startBot,
    stopBot,
  } = useDiscordStatus();

  async function handleToggle() {
    try {
      if (status?.online) {
        await stopBot();
        toast.success("Discord bot stopped");
      } else {
        await startBot();
        toast.success("Discord bot is connecting...");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle bot"
      );
    }
  }

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

  const botState = status.status;

  return (
    <div className="flex items-center gap-2">
      <RiDiscordLine
        className={cn(
          "size-4",
          botState === "online"
            ? "text-[#5865F2]"
            : botState === "connecting"
              ? "text-yellow-500"
              : "text-muted-foreground"
        )}
      />
      <div className="flex items-center gap-1.5">
        {/* Status dot */}
        <span
          className={cn(
            "inline-block size-1.5 rounded-full",
            botState === "online"
              ? "bg-green-500 animate-pulse"
              : botState === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : botState === "error"
                  ? "bg-red-500"
                  : "bg-muted-foreground/40"
          )}
        />
        <span className="text-[11px] text-foreground font-medium">
          {botState === "online"
            ? "Bot Online"
            : botState === "connecting"
              ? "Connecting..."
              : botState === "error"
                ? "Connection Failed"
                : "Bot Offline"}
        </span>
      </div>
      {botState === "error" && status.error && (
        <span className="text-[10px] text-red-500 max-w-[180px] truncate">
          {status.error}
        </span>
      )}
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
      <Button
        variant={status.online ? "outline" : "default"}
        size="xs"
        onClick={handleToggle}
        disabled={isToggling || isConnecting}
        className="ml-1"
      >
        {isToggling || isConnecting ? (
          <RiLoader4Line className="size-3 animate-spin" />
        ) : status.online ? (
          "Stop Bot"
        ) : (
          "Start Bot"
        )}
      </Button>
    </div>
  );
}

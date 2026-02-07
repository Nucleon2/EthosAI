/**
 * DashboardPage - Displays wallet behavioral insights, token analysis
 * history, Discord coaching sessions, and live bot status.
 * Redirects to home if no wallet has been analyzed.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RiBrainLine,
  RiTimeLine,
  RiMicLine,
  RiWallet3Line,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletInsightCard } from "./components/wallet-insight-card";
import { WalletAnalysisHistory } from "./components/wallet-analysis-history";
import { CoachingSessions } from "./components/coaching-sessions";
import { DiscordStatusIndicator } from "./components/discord-status-indicator";

/** Truncates an Ethereum address for compact display. */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function DashboardPage() {
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const walletBehavior = useWalletStore((s) => s.walletBehavior);
  const isAnalyzed = useWalletStore(
    (s) => s.walletAnalysisStatus === "success" && s.walletBehavior !== null
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAnalyzed) {
      navigate("/", { replace: true });
    }
  }, [isAnalyzed, navigate]);

  if (!isAnalyzed || !walletAddress || !walletBehavior) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <BlurFade delay={0.05} duration={0.4}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RiWallet3Line className="size-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[10px]"
              >
                {truncateAddress(walletAddress)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                Behavioral analysis overview
              </span>
            </div>
          </div>

          {/* Discord bot status — top right */}
          <DiscordStatusIndicator />
        </div>
      </BlurFade>

      {/* Tab layout */}
      <Tabs defaultValue="insights">
        <BlurFade delay={0.1} duration={0.4}>
          <TabsList variant="line">
            <TabsTrigger value="insights">
              <RiBrainLine className="size-3.5" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="history">
              <RiTimeLine className="size-3.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="coaching">
              <RiMicLine className="size-3.5" />
              Coaching
            </TabsTrigger>
          </TabsList>
        </BlurFade>

        {/* Insights tab — current wallet behavioral insight */}
        <TabsContent value="insights">
          <BlurFade delay={0.15} duration={0.4}>
            <div className="pt-4">
              <WalletInsightCard
                insight={walletBehavior}
                walletAddress={walletAddress}
              />
            </div>
          </BlurFade>
        </TabsContent>

        {/* History tab — past analyses from the database */}
        <TabsContent value="history">
          <BlurFade delay={0.15} duration={0.4}>
            <div className="pt-4">
              <WalletAnalysisHistory walletAddress={walletAddress} />
            </div>
          </BlurFade>
        </TabsContent>

        {/* Coaching tab — Discord coaching sessions */}
        <TabsContent value="coaching">
          <BlurFade delay={0.15} duration={0.4}>
            <div className="pt-4">
              <CoachingSessions walletAddress={walletAddress} />
            </div>
          </BlurFade>
        </TabsContent>
      </Tabs>
    </div>
  );
}

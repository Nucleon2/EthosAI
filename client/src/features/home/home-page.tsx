/**
 * HomePage - The main landing page of the application.
 * Displays a centered wallet address input with animated background.
 * Once the wallet is analyzed, transitions to the token address input.
 */

import { useCallback } from "react";
import {
  RiCheckboxCircleLine,
  RiCloseLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import { useWalletAnalysis } from "@/hooks/use-wallet-analysis";
import { useTokenAnalysis } from "@/hooks/use-token-analysis";
import { WalletAddressForm } from "@/features/wallet";
import { TokenAddressForm } from "@/features/token";
import { Particles } from "@/components/ui/particles";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/wallet-store";
import { TokenAnalysisResult } from "@/features/token/components/token-analysis-result";

export function HomePage() {
  const {
    walletAddress,
    walletAnalysisStatus,
    walletError,
    isAnalyzed,
    isLoading: isWalletLoading,
    submitWalletAddress,
  } = useWalletAnalysis();

  const {
    tokenAddress,
    tokenAnalysisStatus,
    tokenAnalysis,
    tokenError,
    isLoading: isTokenLoading,
    submitTokenAddress,
    clearTokenAnalysis,
  } = useTokenAnalysis();

  const reset = useWalletStore((s) => s.reset);

  const handleWalletSubmit = useCallback(
    (address: string) => {
      submitWalletAddress(address);
    },
    [submitWalletAddress]
  );

  const handleTokenSubmit = useCallback(
    (address: string) => {
      submitTokenAddress(address);
    },
    [submitTokenAddress]
  );

  /** Truncates an Ethereum address for display. */
  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Animated particle background */}
      <Particles
        className="absolute inset-0"
        quantity={60}
        staticity={30}
        ease={70}
        color="#e11d48"
        size={0.4}
      />

      {/* Main content container */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        {/* Header section */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <RiShieldKeyholeLine className="size-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Derive
              </h1>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Agentic market intelligence and behavioral awareness
              for Ethereum wallets.
            </p>
          </div>
        </BlurFade>

        {/* Dynamic title that changes based on state */}
        <TypingAnimation
          className="text-base font-medium text-foreground sm:text-lg"
          duration={40}
          as="p"
        >
          {isAnalyzed
            ? "Now enter a token contract to analyze"
            : "Enter your Ethereum wallet address to begin"}
        </TypingAnimation>

        {/* Card container with border beam effect */}
        <div className="relative w-full max-w-lg">
          <div className="relative overflow-hidden border border-border bg-card p-6 sm:p-8">
            {/* Border beam animation on loading */}
            {(isWalletLoading || isTokenLoading) && (
              <BorderBeam
                size={80}
                duration={4}
                colorFrom="#e11d48"
                colorTo="#f43f5e"
                borderWidth={2}
              />
            )}

            <div className="flex flex-col items-center gap-6">
              {/* Wallet analysis section */}
              {!isAnalyzed ? (
                <>
                  <BlurFade delay={0.2} duration={0.5}>
                    <div className="flex flex-col items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-foreground">
                        Wallet Analysis
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll analyze your on-chain activity and trading
                        patterns using AI-powered behavioral analysis.
                      </p>
                    </div>
                  </BlurFade>

                  <WalletAddressForm
                    onSubmit={handleWalletSubmit}
                    isLoading={isWalletLoading}
                  />

                  {/* Loading state message */}
                  {isWalletLoading && (
                    <BlurFade delay={0} duration={0.3}>
                      <p className="text-xs text-muted-foreground animate-pulse">
                        Fetching on-chain data and running behavioral
                        analysis... This may take a moment.
                      </p>
                    </BlurFade>
                  )}

                  {/* Error state */}
                  {walletAnalysisStatus === "error" && walletError && (
                    <BlurFade delay={0} duration={0.3}>
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <RiCloseLine className="size-4 shrink-0" />
                        <span>{walletError}</span>
                      </div>
                    </BlurFade>
                  )}
                </>
              ) : (
                <>
                  {/* Success state - show analyzed wallet + token form */}
                  <BlurFade delay={0.1} duration={0.5}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2">
                        <RiCheckboxCircleLine className="size-5 text-green-600" />
                        <span className="text-sm font-medium text-foreground">
                          Wallet Analyzed
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {walletAddress
                            ? truncateAddress(walletAddress)
                            : ""}
                        </Badge>
                        <button
                          onClick={reset}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
                          type="button"
                        >
                          Change wallet
                        </button>
                      </div>
                    </div>
                  </BlurFade>

                  <BlurFade delay={0.2} duration={0.5}>
                    <div className="flex flex-col items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-foreground">
                        Token Analysis
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Enter an ERC-20 token contract address to get
                        personalized market insights and behavioral analysis.
                      </p>
                    </div>
                  </BlurFade>

                  <TokenAddressForm
                    onSubmit={handleTokenSubmit}
                    isLoading={isTokenLoading}
                  />

                  {/* Loading state message */}
                  {isTokenLoading && (
                    <BlurFade delay={0} duration={0.3}>
                      <p className="text-xs text-muted-foreground animate-pulse">
                        Analyzing token market data and your behavioral
                        patterns...
                      </p>
                    </BlurFade>
                  )}

                  {/* Token error state */}
                  {tokenAnalysisStatus === "error" && tokenError && (
                    <BlurFade delay={0} duration={0.3}>
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <RiCloseLine className="size-4 shrink-0" />
                        <span>{tokenError}</span>
                      </div>
                    </BlurFade>
                  )}

                  {/* Token analysis success */}
                  {tokenAnalysisStatus === "success" &&
                    tokenAnalysis &&
                    tokenAddress && (
                      <TokenAnalysisResult
                        analysis={tokenAnalysis}
                        tokenAddress={tokenAddress}
                        onClear={clearTokenAnalysis}
                      />
                    )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <BlurFade delay={0.5} duration={0.5}>
          <p className="text-[10px] text-muted-foreground/60">
            This tool provides behavioral insights only. It does not provide
            financial advice or trading signals.
          </p>
        </BlurFade>
      </div>
    </div>
  );
}

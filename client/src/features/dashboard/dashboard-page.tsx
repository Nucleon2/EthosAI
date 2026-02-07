/**
 * DashboardPage - Displays wallet behavioral insights, token analysis
 * history, Discord coaching sessions, and live bot status.
 * Redirects to home if no wallet has been analyzed.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useWalletStore } from "@/stores/wallet-store";

export function DashboardPage() {
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const isAnalyzed = useWalletStore(
    (s) => s.walletAnalysisStatus === "success" && s.walletBehavior !== null
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAnalyzed) {
      navigate("/", { replace: true });
    }
  }, [isAnalyzed, navigate]);

  if (!isAnalyzed || !walletAddress) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}

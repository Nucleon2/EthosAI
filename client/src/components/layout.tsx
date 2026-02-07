/**
 * Layout - Shared layout with a minimal top navigation bar.
 * Wraps all routes and provides consistent branding and navigation.
 */

import { Link, Outlet, useLocation } from "react-router";
import {
  RiShieldKeyholeLine,
  RiHome4Line,
  RiDashboardLine,
} from "@remixicon/react";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: RiHome4Line },
  { to: "/dashboard", label: "Dashboard", icon: RiDashboardLine },
] as const;

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <RiShieldKeyholeLine className="size-5 text-primary" />
            <span className="text-sm font-bold tracking-tight text-foreground">
              Derive
            </span>
          </Link>

          {/* Navigation links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}

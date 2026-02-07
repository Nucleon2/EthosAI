/**
 * SocialShareModal - A modal that displays AI-generated social media posts
 * for Threads, X (Twitter), and LinkedIn. Users can copy post text and
 * navigate to each platform to paste and publish.
 *
 * Uses TanStack Query useMutation for the generation request.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  RiCloseLine,
  RiFileCopyLine,
  RiCheckLine,
  RiThreadsLine,
  RiTwitterXLine,
  RiLinkedinBoxLine,
  RiLoader4Line,
  RiExternalLinkLine,
  RiAlertLine,
} from "@remixicon/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { generateSocialPosts } from "@/services/api";
import type { TokenAnalysis } from "@/types/api";

interface SocialShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenAnalysis: TokenAnalysis;
  tokenAddress: string;
  tokenSymbol?: string;
}

/** Platform metadata for rendering each post section. */
const PLATFORMS = [
  {
    key: "threads" as const,
    label: "Threads",
    icon: RiThreadsLine,
    composeUrl: (text: string) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
    buttonLabel: "Open Threads",
  },
  {
    key: "x" as const,
    label: "X (Twitter)",
    icon: RiTwitterXLine,
    composeUrl: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    buttonLabel: "Open X",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    icon: RiLinkedinBoxLine,
    composeUrl: (_text: string) =>
      "https://www.linkedin.com/feed/?shareActive=true",
    buttonLabel: "Open LinkedIn",
  },
] as const;

export function SocialShareModal({
  open,
  onOpenChange,
  tokenAnalysis,
  tokenAddress,
  tokenSymbol,
}: SocialShareModalProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(
    null
  );
  const copyTimeoutRef = useRef<number | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      generateSocialPosts(tokenAnalysis, tokenAddress, tokenSymbol),
  });

  /** Derive status from mutation for readability in JSX. */
  const status = mutation.status === "idle"
    ? "idle"
    : mutation.status === "pending"
      ? "loading"
      : mutation.status;
  const posts =
    mutation.data?.success && mutation.data.posts
      ? mutation.data.posts
      : null;
  const error = mutation.error
    ? mutation.error instanceof Error
      ? mutation.error.message
      : "An unexpected error occurred"
    : mutation.data && !mutation.data.success
      ? (mutation.data.error ?? "Failed to generate posts")
      : null;

  /** Trigger generation when modal opens. */
  useEffect(() => {
    if (open && mutation.isIdle) {
      mutation.mutate();
    }
  }, [open, mutation.isIdle]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Reset state when modal closes. */
  useEffect(() => {
    if (!open) {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }

      const timer = setTimeout(() => {
        mutation.reset();
        setCopiedPlatform(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Copy post text to clipboard with brief visual feedback. */
  const handleCopy = useCallback(
    async (platform: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedPlatform(platform);

        if (copyTimeoutRef.current !== null) {
          clearTimeout(copyTimeoutRef.current);
        }

        copyTimeoutRef.current = window.setTimeout(() => {
          setCopiedPlatform(null);
          copyTimeoutRef.current = null;
        }, 2000);
      } catch {
        // Fallback: select text for manual copy
      }
    },
    []
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "data-open:animate-in data-closed:animate-out",
            "data-closed:fade-out-0 data-open:fade-in-0",
            "bg-black/10 duration-100",
            "supports-backdrop-filter:backdrop-blur-xs",
            "fixed inset-0 isolate z-50"
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "data-open:animate-in data-closed:animate-out",
            "data-closed:fade-out-0 data-open:fade-in-0",
            "data-closed:zoom-out-95 data-open:zoom-in-95",
            "bg-background ring-foreground/10 ring-1",
            "fixed top-1/2 left-1/2 z-50",
            "-translate-x-1/2 -translate-y-1/2",
            "w-full max-w-lg max-h-[85vh] overflow-y-auto",
            "p-0 outline-none duration-100"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
              Share Your Analysis
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiCloseLine className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Loading state */}
            {status === "loading" ? (
              <BlurFade delay={0} duration={0.3}>
                <div className="flex flex-col items-center gap-3 py-8">
                  <RiLoader4Line className="size-6 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Generating social posts from your analysis...
                  </p>
                </div>
              </BlurFade>
            ) : null}

            {/* Error state */}
            {status === "error" && error ? (
              <BlurFade delay={0} duration={0.3}>
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <RiAlertLine className="size-4" />
                    <span className="text-xs">{error}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutation.mutate()}
                  >
                    Try again
                  </Button>
                </div>
              </BlurFade>
            ) : null}

            {/* Success state: show all three platform posts */}
            {status === "success" && posts ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Copy the text and post it on your favorite platform.
                </p>

                {PLATFORMS.map((platform, index) => {
                  const post = posts[platform.key];
                  const isCopied = copiedPlatform === platform.key;
                  const Icon = platform.icon;

                  return (
                    <BlurFade
                      key={platform.key}
                      delay={0.05 * (index + 1)}
                      duration={0.4}
                    >
                      <div className="border border-border p-3 space-y-3">
                        {/* Platform header */}
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-foreground" />
                          <span className="text-xs font-semibold text-foreground">
                            {platform.label}
                          </span>
                        </div>

                        {/* Post content */}
                        <div className="bg-muted/50 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                          {post.content}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(platform.key, post.content)
                            }
                            className="gap-1.5"
                          >
                            {isCopied ? (
                              <>
                                <RiCheckLine
                                  className="size-3.5 text-green-600"
                                  data-icon="inline-start"
                                />
                                Copied
                              </>
                            ) : (
                              <>
                                <RiFileCopyLine
                                  className="size-3.5"
                                  data-icon="inline-start"
                                />
                                Copy
                              </>
                            )}
                          </Button>

                          <Button
                            
                            variant="default"
                            size="sm"
                            className="gap-1.5"
                          >
                            <a
                              href={platform.composeUrl(post.content)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex"
                            >
                              <RiExternalLinkLine
                                className="size-3.5"
                                data-icon="inline-start"
                              />
                              {platform.buttonLabel}
                            </a>
                          </Button>
                        </div>
                      </div>
                    </BlurFade>
                  );
                })}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Posts are AI-generated behavioral insights, not financial advice.
            </p>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

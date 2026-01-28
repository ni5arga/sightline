"use client";

import { useState, useCallback } from "react";

interface ShareButtonProps {
  query: string | null;
  disabled?: boolean;
}

type ShareState = "idle" | "copied" | "error" | "too-long";

/**
 * Share button that copies the current search URL to clipboard.
 * Handles clipboard API with fallback, URL validation, and visual feedback.
 */
export default function ShareButton({
  query,
  disabled = false,
}: ShareButtonProps) {
  const [state, setState] = useState<ShareState>("idle");

  const handleShare = useCallback(async () => {
    if (!query || state !== "idle") return;

    try {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const encodedQuery = encodeURIComponent(query.trim());
      const shareUrl = `${baseUrl}?q=${encodedQuery}`;

      // Check URL length (browsers typically support up to ~2000 chars)
      if (shareUrl.length > 2000) {
        setState("too-long");
        setTimeout(() => setState("idle"), 2000);
        return;
      }

      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
        return;
      }

      // Fallback: Create a temporary textarea and use execCommand
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.cssText = "position:fixed;left:-999999px;top:-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (success) {
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      } else {
        throw new Error("execCommand failed");
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [query, state]);

  const isDisabled = disabled || !query;
  const buttonClass = `share-button ${state === "copied" ? "copied" : ""} ${state === "error" || state === "too-long" ? "error" : ""}`;

  return (
    <button
      className={buttonClass}
      onClick={handleShare}
      disabled={isDisabled}
      title="Copy shareable link"
      aria-label={
        state === "copied" ? "Link copied to clipboard" : "Share search"
      }
    >
      <ShareIcon state={state} />
      <span className="share-text">{getButtonText(state)}</span>
    </button>
  );
}

function ShareIcon({ state }: { state: ShareState }) {
  if (state === "copied") {
    return (
      <svg
        className="share-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (state === "error" || state === "too-long") {
    return (
      <svg
        className="share-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  // Default: Link icon
  return (
    <svg
      className="share-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function getButtonText(state: ShareState): string {
  switch (state) {
    case "copied":
      return "Copied!";
    case "error":
      return "Failed";
    case "too-long":
      return "Too long";
    default:
      return "Share";
  }
}

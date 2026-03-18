"use client";

import { useState, useEffect } from "react";
import {
  X,
  Crown,
  Lock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Share2,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { postToSquare, SquarePostResult } from "@/lib/squareClient";

interface SquarePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  postTitle: string;
}

export function SquarePostModal({
  isOpen,
  onClose,
  initialContent,
  postTitle,
}: SquarePostModalProps) {
  const { apiKeys, setAPIKeys, saveKeysToServer } = useAppStore();

  const [content, setContent] = useState(initialContent);
  const [squareApiKey, setSquareApiKey] = useState(apiKeys?.squareApiKey || "");
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<SquarePostResult | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(!apiKeys?.squareApiKey);
  const [saveKey, setSaveKey] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const reset = setTimeout(() => {
        setContent(initialContent);
        setSquareApiKey(apiKeys?.squareApiKey || "");
        setShowKeyInput(!apiKeys?.squareApiKey);
        setResult(null);
        setIsPosting(false);
      }, 0);
      return () => clearTimeout(reset);
    }
  }, [isOpen, initialContent, apiKeys?.squareApiKey]);

  if (!isOpen) return null;

  const handlePost = async () => {
    if (!squareApiKey.trim()) return;
    setIsPosting(true);

    // Optionally save the key
    if (saveKey && apiKeys) {
      const newKeys = { ...apiKeys, squareApiKey };
      setAPIKeys(newKeys);
      await saveKeysToServer(newKeys);
    }

    const res = await postToSquare(content, squareApiKey);
    setResult(res);
    setIsPosting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg),black_80%)] backdrop-blur-md" />

      {/* Modal Card */}
      <div className="relative bg-card border border-card-border rounded-[16px] p-6 w-full max-w-lg mt-24 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-accent" />
            <span className="text-text-primary font-bold text-lg">{postTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition p-1 rounded hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_60%)]"
            aria-label="Close post modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-[color-mix(in_srgb,var(--color-card-border),transparent_50%)] mb-5" />

        {/* SUCCESS STATE */}
        {result?.success && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-agent-scout mx-auto mb-4" />
            <p className="text-text-primary text-lg font-bold mb-2">Posted to Binance Square!</p>
            {result.postUrl && (
              <a
                href={result.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-dim transition text-sm font-medium inline-flex items-center gap-1.5"
              >
                View your post <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="mt-6">
              <button
                onClick={onClose}
                className="bg-card border border-card-border rounded-button px-5 py-2 text-text-secondary text-sm font-medium hover:border-card-border-hover hover:text-text-primary transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {result && !result.success && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 text-risk-extreme mx-auto mb-3" />
            <p className="text-text-primary text-base font-bold mb-2">Post Failed</p>
            <p className="text-text-secondary text-sm mb-4">{result.errorMessage}</p>
            <button
              onClick={() => setResult(null)}
              className="border border-card-border-hover text-text-primary px-4 py-2 rounded-button text-sm font-bold hover:bg-card-hover hover:text-text-primary transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* COMPOSE STATE */}
        {!result && (
          <>
            {/* Content Textarea */}
            <div>
              <label className="block text-text-primary text-sm font-medium mb-2">
                Post Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-card border border-card-border rounded-card p-4 text-text-primary text-sm resize-none h-40 focus:outline-none focus:border-accent transition-colors placeholder-text-dim"
                placeholder="Write your post..."
              />
              <div className="text-right mt-1">
                <span
                  className={`text-xs ${content.length > 500 ? "text-risk-extreme" : "text-text-muted"}`}
                >
                  {content.length}/500
                </span>
              </div>
            </div>

            {/* API Key Input */}
            {showKeyInput && (
              <div className="bg-accent-bg border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] rounded-card p-4 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-accent" />
                  <span className="text-accent text-sm font-semibold">Square API Key Required</span>
                </div>
                <p className="text-text-secondary text-xs mt-1 mb-3">
                  This is separate from your trading API key. Get it from Binance Square → Settings
                  → OpenAPI.
                </p>
                <input
                  type="password"
                  value={squareApiKey}
                  onChange={(e) => setSquareApiKey(e.target.value)}
                  placeholder="Enter X-Square-OpenAPI-Key"
                  className="w-full bg-card border border-card-border rounded-button px-4 py-2.5 text-text-primary placeholder-text-dim focus:outline-none focus:border-accent font-mono text-sm"
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveKey}
                    onChange={(e) => setSaveKey(e.target.checked)}
                    className="w-4 h-4 rounded border-card-border bg-card accent-accent"
                  />
                  <span className="text-text-secondary text-xs">Save key for future posts</span>
                </label>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={onClose}
                className="bg-card border border-card-border rounded-button px-4 py-2 text-text-secondary text-sm font-medium hover:border-card-border-hover hover:text-text-primary transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={isPosting || !content.trim() || !squareApiKey.trim()}
                className="bg-text-primary disabled:opacity-50 disabled:cursor-not-allowed text-amoled font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Post to Square
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

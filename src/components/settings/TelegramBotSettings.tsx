"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface TelegramBotStatus {
  configured: boolean;
  botUsername?: string;
  isActive?: boolean;
  webhookUrl?: string;
  webhookConfigured?: boolean;
}

export function TelegramBotSettings() {
  const { toast } = useToast();

  const [status, setStatus] = useState<TelegramBotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telegram/bot", {
        credentials: "include",
      });
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load Telegram status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBot = async () => {
    if (!botToken.trim()) {
      toast("error", "Please enter a bot token");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/telegram/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ botToken: botToken.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast("error", data.error || "Failed to setup bot");
        return;
      }

      toast("success", `Bot @${data.botUsername} connected successfully!`);
      setBotToken("");
      setStatus(data);
    } catch (error) {
      toast("error", "Failed to setup bot");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!confirm("Are you sure you want to disconnect your Telegram bot?")) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/telegram/bot", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Failed to delete bot");
        return;
      }

      toast("success", "Telegram bot disconnected");
      setStatus({ configured: false });
    } catch (error) {
      toast("error", "Failed to delete bot");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openBotFather = () => {
    window.open("https://t.me/BotFather", "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)]">
          <Bot className="w-5 h-5 text-black" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Telegram Bot</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Create your own personal Telegram bot
          </p>
        </div>
      </div>

      {!status?.configured ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
            <h3 className="font-medium text-[var(--color-accent)] mb-2">How to create your bot:</h3>
            <ol className="text-sm text-[var(--color-text-secondary)] space-y-2 list-decimal list-inside">
              <li>
                Open{" "}
                <button
                  onClick={openBotFather}
                  className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                >
                  @BotFather <ExternalLink className="w-3 h-3" />
                </button>{" "}
                in Telegram
              </li>
              <li>Send /newbot to create a new bot</li>
              <li>Follow the instructions and get your bot token</li>
              <li>Paste the token below</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              Bot Token
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-card-border)] focus:border-[var(--color-accent)] focus:outline-none font-mono text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <button
            onClick={handleSetupBot}
            disabled={saving || !botToken.trim()}
            className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>Connect Bot</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center gap-3">
            <Check className="w-5 h-5 text-[var(--color-accent)]" />
            <div>
              <p className="font-medium text-[var(--color-accent)]">
                Connected to @{status.botUsername}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {status.isActive ? "Webhook active" : "Webhook not configured"}
              </p>
            </div>
          </div>

          {status.webhookUrl && (
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={status.webhookUrl}
                  readOnly
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-card-border)] font-mono text-sm text-[var(--color-text-dim)]"
                />
                <button
                  onClick={handleCopyWebhook}
                  className="px-4 py-3 rounded-xl bg-[var(--color-card-hover)] hover:bg-[var(--color-card-border)] transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[var(--color-accent)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-dim)] mt-2">
                This URL receives real-time updates from Telegram.
              </p>
            </div>
          )}

          {!status.webhookConfigured && status.webhookUrl && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Webhook setup failed</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Automatic webhook setup failed. Please ensure your deployment URL is correct and
                  supports HTTPS. Try disconnecting and reconnecting your bot.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleDeleteBot}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-risk-extreme/10 hover:bg-risk-extreme/20 border border-risk-extreme/30 text-risk-extreme transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Disconnect Bot</span>
          </button>
        </div>
      )}
    </div>
  );
}

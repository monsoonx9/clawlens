"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  Bell,
  RefreshCw,
  Link2,
} from "lucide-react";

interface TelegramBotStatus {
  configured: boolean;
  botUsername?: string;
  isActive?: boolean;
  webhookUrl?: string;
  webhookConfigured?: boolean;
  linked?: boolean;
  chatId?: string;
}

interface NotificationSettings {
  telegramEnabled: boolean;
  priceAlerts: boolean;
  whaleAlerts: boolean;
  portfolioDigest: boolean;
  newsAlerts: boolean;
  digestTime: string;
}

export function TelegramBotSettings() {
  const { toast } = useToast();

  const [status, setStatus] = useState<TelegramBotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telegram/bot", {
        credentials: "include",
      });
      const data = await res.json();
      setStatus(data);

      if (data.configured) {
        loadNotificationSettings();
      }
    } catch (error) {
      console.error("Failed to load Telegram status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loadNotificationSettings = async () => {
    try {
      const res = await fetch("/api/telegram/notifications", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    try {
      const res = await fetch("/api/telegram/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setNotifications(settings);
        toast("success", "Notification settings saved!");
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast("error", "Failed to save settings");
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
      await loadStatus();
    } catch {
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
      setNotifications(null);
      setShowNotifications(false);
      setLinkCode(null);
    } catch {
      toast("error", "Failed to delete bot");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLinkCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await fetch("/api/telegram/bot/generate-code", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setLinkCode(data.code);
        toast("success", "Link code generated!");
      } else {
        toast("error", "Failed to generate code");
      }
    } catch {
      toast("error", "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      toast("success", "Code copied!");
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
            Your personal AI assistant on Telegram
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

          {status.linked && status.chatId && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-500">Account Linked</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Chat ID: <span className="font-mono">{status.chatId}</span>
                </p>
              </div>
            </div>
          )}

          {!status.linked && (
            <div className="p-4 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-medium text-[var(--color-text-primary)]">Link Your Account</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Generate a link code and send it to your bot to connect your Telegram account.
              </p>

              {linkCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-accent)] text-center">
                      <span className="text-2xl font-mono font-bold text-[var(--color-accent)] tracking-widest">
                        {linkCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-3 rounded-xl bg-[var(--color-card-hover)] hover:bg-[var(--color-card-border)] transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--color-text-dim)]">
                    Send{" "}
                    <code className="bg-card px-1.5 py-0.5 rounded text-accent">
                      /link {linkCode}
                    </code>{" "}
                    to your bot within 5 minutes
                  </p>
                  <button
                    onClick={() => setLinkCode(null)}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                  >
                    Generate new code
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateLinkCode}
                  disabled={generatingCode}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--color-accent)] text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {generatingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Generate Link Code</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span className="text-[var(--color-text-primary)]">Notification Settings</span>
            </div>
            <span className="text-[var(--color-text-secondary)]">
              {showNotifications ? "▲" : "▼"}
            </span>
          </button>

          {showNotifications && notifications && (
            <div className="p-4 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] space-y-4">
              <ToggleSwitch
                label="Telegram Notifications"
                description="Receive notifications via your bot"
                enabled={notifications.telegramEnabled}
                onChange={(enabled) =>
                  saveNotificationSettings({ ...notifications, telegramEnabled: enabled })
                }
              />

              {notifications.telegramEnabled && (
                <>
                  <ToggleSwitch
                    label="Price Alerts"
                    description="Get notified when tokens hit target prices"
                    enabled={notifications.priceAlerts}
                    onChange={(enabled) =>
                      saveNotificationSettings({ ...notifications, priceAlerts: enabled })
                    }
                  />

                  <ToggleSwitch
                    label="Whale Alerts"
                    description="Track large wallet movements"
                    enabled={notifications.whaleAlerts}
                    onChange={(enabled) =>
                      saveNotificationSettings({ ...notifications, whaleAlerts: enabled })
                    }
                  />

                  <ToggleSwitch
                    label="Portfolio Digest"
                    description="Daily summary of your portfolio"
                    enabled={notifications.portfolioDigest}
                    onChange={(enabled) =>
                      saveNotificationSettings({ ...notifications, portfolioDigest: enabled })
                    }
                  />

                  <ToggleSwitch
                    label="News Alerts"
                    description="Important crypto news updates"
                    enabled={notifications.newsAlerts}
                    onChange={(enabled) =>
                      saveNotificationSettings({ ...notifications, newsAlerts: enabled })
                    }
                  />
                </>
              )}
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

function ToggleSwitch({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-card-border)]"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { Link2, Unlink, Loader2, Check, ExternalLink } from "lucide-react";

export function TelegramConnection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatId, setChatId] = useState("");
  const [status, setStatus] = useState<{
    connected: boolean;
    chatId?: string;
    linkedAt?: string;
  } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telegram/link", { credentials: "include" });
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load Telegram connection status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!chatId.trim()) {
      toast("error", "Please enter your Telegram Chat ID");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId: chatId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast("error", data.error || "Failed to link account");
        return;
      }

      toast("success", "Account successfully linked to Telegram!");
      setChatId("");
      loadStatus();
    } catch (error) {
      toast("error", "Failed to link account");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (
      !confirm(
        "Are you sure you want to unlink your Telegram account? You will stop receiving alerts or portfolio features via the bot.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/telegram/link", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Failed to unlink account");
        return;
      }

      toast("success", "Telegram account unlinked correctly");
      setStatus({ connected: false });
    } catch (error) {
      toast("error", "Failed to unlink account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border-b border-card-border last:border-0">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 border-b border-card-border mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center border border-[var(--color-accent)]/30">
          <Link2 className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            Telegram Connection
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Connect the official bot to access your portfolio directly
          </p>
        </div>
      </div>

      {!status?.connected ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
            <h3 className="font-medium text-[var(--color-accent)] mb-2">
              How to link your account:
            </h3>
            <ol className="text-sm text-[var(--color-text-secondary)] space-y-2 list-decimal list-inside">
              <li>Message the official ClawLens trading bot in Telegram</li>
              <li>
                Type <code className="bg-card px-1.5 py-0.5 rounded text-accent">/link</code>, the
                bot will show a <b>Chat ID</b> code
              </li>
              <li>Paste the numeric Chat ID into the field below</li>
              <li>Click Connect to finalize the link</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. 1462145377"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-card-border)] focus:border-[var(--color-accent)] focus:outline-none font-mono text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <button
            onClick={handleLink}
            disabled={saving || !chatId.trim()}
            className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Connect Telegram</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-[var(--color-accent)]" />
              <div>
                <p className="font-medium text-[var(--color-accent)]">
                  Account successfully linked
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Chat ID:{" "}
                  <span className="font-mono text-[var(--color-text-primary)]">
                    {status.chatId}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleUnlink}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-risk-extreme/10 hover:bg-risk-extreme/20 border border-risk-extreme/30 text-risk-extreme transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
            <span>Unlink Account</span>
          </button>
        </div>
      )}
    </div>
  );
}

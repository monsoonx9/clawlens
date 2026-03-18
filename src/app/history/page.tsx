"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { SessionCard, SkeletonSessionCard } from "@/components/history/SessionCard";
import { Clock, Trash2, Zap, ArrowRight, AlertTriangle } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { sessions, clearSessions } = useAppStore();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    clearSessions();
    setShowConfirm(false);
    toast("success", "History cleared successfully");
  };

  // Prevent hydration mismatch / show skeletons on load
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // ------------------------------------------------------------------
  // LOADING STATE (Hydration)
  // ------------------------------------------------------------------
  if (!isMounted) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">Council History</h1>
            <p className="text-text-muted text-sm mt-1">Loading sessions...</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonSessionCard />
          <SkeletonSessionCard />
          <SkeletonSessionCard />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY STATE
  // ------------------------------------------------------------------
  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">Council History</h1>
            <p className="text-text-muted text-sm mt-1">0 sessions</p>
          </div>
        </div>

        {/* Empty */}
        <div className="glass-card p-8 sm:p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Faded Watermark */}
          <Image
            src="/logo_v1.webp"
            alt="Background Logo"
            width={320}
            height={320}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none blur-sm"
          />

          <Clock className="w-12 h-12 text-text-muted mb-5 relative z-10" />
          <p className="text-text-primary text-lg font-semibold mb-1 relative z-10">
            No sessions yet
          </p>
          <p className="text-text-secondary text-sm mb-6 relative z-10">
            Ask the Council something to get started
          </p>
          <button
            onClick={() => router.push("/council")}
            className="bg-text-primary text-amoled font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target relative z-10"
          >
            <Zap className="w-4 h-4" />
            Go to Council
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // SESSION LIST
  // ------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Council History</h1>
          <p className="text-text-muted text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_75%)] text-risk-extreme rounded-full px-4 py-2 text-sm font-semibold hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] transition-all flex items-center gap-2 touch-target"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear History</span>
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="mb-6 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] backdrop-blur-md border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="w-5 h-5 text-risk-extreme shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-text-primary text-sm font-semibold">Clear all session history?</p>
            <p className="text-text-secondary text-xs mt-1">
              This action cannot be undone. All {sessions.length} sessions will be permanently
              deleted.
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleClear}
                className="bg-risk-extreme text-text-primary text-xs sm:text-sm font-bold px-4 py-2 rounded-full hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),var(--color-text-primary)_10%)] transition-all touch-target"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-text-secondary text-xs sm:text-sm font-medium px-4 py-2 rounded-full hover:text-text-primary transition-all touch-target"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Cards */}
      <div className="flex flex-col gap-4">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

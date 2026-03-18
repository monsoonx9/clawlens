"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  CheckCircle2,
  XCircle,
  KeyRound,
  BrainCircuit,
  Plug,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PROVIDER_DISPLAY_NAMES } from "@/lib/providers";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { apiKeys, clearAllUserData } = useAppStore();

  const isLoggedIn = !!(apiKeys?.llmApiKey || apiKeys?.binanceApiKey || apiKeys?.binanceSecretKey);

  const binanceConnected = !!(apiKeys?.binanceApiKey && apiKeys?.binanceSecretKey);
  const llmConnected = !!apiKeys?.llmApiKey || apiKeys?.llmProvider === "ollama";
  const llmProvider = apiKeys?.llmProvider || "openai";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showConfirm]);

  const handleLogout = () => {
    setIsOpen(false);
    setShowConfirm(true);
  };

  const confirmLogout = () => {
    clearAllUserData();
    setShowConfirm(false);
    router.push("/");
  };

  const cancelLogout = () => {
    setShowConfirm(false);
  };

  const handleConnect = () => {
    setIsOpen(false);
    router.push("/onboarding");
  };

  const modalContent = showConfirm ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md"
      onClick={cancelLogout}
    >
      <div
        className="relative bg-[color-mix(in_srgb,var(--color-card),transparent_5%)] border border-card-border rounded-2xl p-6 w-full max-w-[360px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] flex items-center justify-center mx-auto mb-4">
            <LogOut size={28} className="text-risk-extreme" />
          </div>
          <h3 className="text-text-primary text-lg font-bold mb-2">Disconnect & Logout?</h3>
          <p className="text-text-secondary text-sm mb-6">
            This will clear all your data including API keys, watchlist, whale wallets, and session
            history. You&apos;ll need to set up everything again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={cancelLogout}
              className="flex-1 py-3 bg-card border border-card-border text-text-primary font-bold rounded-xl hover:bg-card-hover hover:border-card-border-hover transition-all touch-target"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 py-3 bg-risk-extreme text-amoled font-bold rounded-xl border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] hover:scale-105 active:scale-95 transition-all touch-target"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg lg:bg-[color-mix(in_srgb,var(--color-bg),transparent_5%)] backdrop-blur-md flex items-center justify-center shrink-0 cursor-pointer overflow-hidden ring-2 ring-card-border hover:ring-card-border-hover transition-all touch-target"
        >
          <User className="w-5 h-5 text-text-secondary" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[color-mix(in_srgb,var(--color-bg),transparent_5%)] backdrop-blur-md border border-card-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-card-border bg-[color-mix(in_srgb,var(--color-card),transparent_60%)]">
              <p className="text-text-primary font-semibold text-sm">
                {isLoggedIn ? "ClawLens Operator" : "Guest User"}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                {isLoggedIn ? "Connected" : "Exploring"}
              </p>
            </div>

            <div className="p-3 space-y-2 border-b border-card-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-text-muted" />
                  <span className="text-text-secondary text-sm">Binance</span>
                </div>
                {binanceConnected ? (
                  <span className="flex items-center gap-1 text-risk-low text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-risk-extreme text-xs font-medium">
                    <XCircle className="w-3 h-3" />
                    Not Connected
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-text-muted" />
                  <span className="text-text-secondary text-sm">AI Agent</span>
                </div>
                {llmConnected ? (
                  <span className="flex items-center gap-1 text-risk-low text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {PROVIDER_DISPLAY_NAMES[llmProvider as keyof typeof PROVIDER_DISPLAY_NAMES] ||
                      llmProvider}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-risk-extreme text-xs font-medium">
                    <XCircle className="w-3 h-3" />
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-text-secondary hover:text-text-primary hover:bg-card rounded-xl transition-all text-sm"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-risk-extreme hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] rounded-xl transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect & Logout
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-risk-low hover:bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] rounded-xl transition-all text-sm"
                >
                  <Plug className="w-4 h-4" />
                  Connect Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}

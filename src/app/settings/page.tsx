"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { AgentName, LLMProvider } from "@/types";
import { AGENTS } from "@/lib/constants";
import { testConnectivity } from "@/lib/binanceClient";
import { useVerifyLLM } from "@/hooks/useVerifyLLM";
import {
  Save,
  KeyRound,
  BrainCircuit,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Loader2,
  Info,
  Share2,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PROVIDER_MODELS, PROVIDER_DISPLAY_NAMES } from "@/lib/providers";
import { TelegramBotSettings } from "@/components/settings/TelegramBotSettings";

export default function SettingsPage() {
  const { apiKeys, preferences, setAPIKeys, saveKeysToServer, updatePreferences } = useAppStore();
  const { toast } = useToast();

  // Binance Local State
  const [binanceKey, setBinanceKey] = useState(apiKeys?.binanceApiKey || "");
  const [binanceSecret, setBinanceSecret] = useState(apiKeys?.binanceSecretKey || "");
  const [showSecret, setShowSecret] = useState(false);
  const [isBinanceVerifying, setIsBinanceVerifying] = useState(false);

  // AI Local State
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(apiKeys?.llmProvider || "openai");
  const [llmKey, setLlmKey] = useState(apiKeys?.llmApiKey || "");
  const [llmModel, setLlmModel] = useState(apiKeys?.llmModel || PROVIDER_MODELS.openai[0]);
  const [llmBaseUrl, setLlmBaseUrl] = useState(apiKeys?.llmBaseUrl || "");
  const [llmEndpoint, setLlmEndpoint] = useState(apiKeys?.llmEndpoint || "");
  const [llmDeploymentName, setLlmDeploymentName] = useState(apiKeys?.llmDeploymentName || "");

  // Square Local State
  const [squareKey, setSquareKey] = useState(apiKeys?.squareApiKey || "");
  const [isEditingSquare, setIsEditingSquare] = useState(!apiKeys?.squareApiKey);

  // AI Verification Hook
  const {
    isVerifying: isLlmVerifying,
    isVerified: isLlmVerified,
    error: llmError,
    verify: verifyLLM,
    resetVerification: resetLlmVerification,
  } = useVerifyLLM();

  // Prefs Local State
  const [riskTolerance, setRiskTolerance] = useState(preferences.riskTolerance);
  const [defaultInvestment, setDefaultInvestment] = useState(
    preferences.defaultInvestmentSize.toString(),
  );
  const [enabledAgents, setEnabledAgents] = useState<Set<AgentName>>(
    new Set(preferences.enabledAgents),
  );

  // Keep model in sync if provider changes
  useEffect(() => {
    if (!PROVIDER_MODELS[llmProvider].includes(llmModel)) {
      setLlmModel(PROVIDER_MODELS[llmProvider][0]);
    }
  }, [llmProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local form state with hydrated store (after page refresh)
  useEffect(() => {
    if (apiKeys) {
      setBinanceKey(apiKeys.binanceApiKey || "");
      setBinanceSecret(apiKeys.binanceSecretKey || "");
      setLlmProvider(apiKeys.llmProvider || "openai");
      setLlmKey(apiKeys.llmApiKey);
      setLlmModel(apiKeys.llmModel);
      setLlmBaseUrl(apiKeys.llmBaseUrl || "");
      setLlmEndpoint(apiKeys.llmEndpoint || "");
      setLlmDeploymentName(apiKeys.llmDeploymentName || "");
      setSquareKey(apiKeys.squareApiKey || "");
      setIsEditingSquare(!apiKeys.squareApiKey);
      resetLlmVerification();
    }
  }, [apiKeys, resetLlmVerification]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAgent = (agent: AgentName) => {
    if (agent === "THE_ARBITER") return;
    const next = new Set(enabledAgents);
    if (next.has(agent)) next.delete(agent);
    else next.add(agent);
    setEnabledAgents(next);
  };

  const handleSaveBinance = async () => {
    setIsBinanceVerifying(true);
    try {
      // Save keys FIRST (without waiting for verification)
      const newKeys = {
        binanceApiKey: binanceKey,
        binanceSecretKey: binanceSecret,
        llmProvider: apiKeys?.llmProvider || "openai",
        llmApiKey: apiKeys?.llmApiKey || "",
        llmModel: apiKeys?.llmModel || PROVIDER_MODELS.openai[0],
        llmBaseUrl: apiKeys?.llmBaseUrl || "",
        llmEndpoint: apiKeys?.llmEndpoint || "",
        llmDeploymentName: apiKeys?.llmDeploymentName || "",
        squareApiKey: apiKeys?.squareApiKey || "",
      };
      setAPIKeys(newKeys);
      await saveKeysToServer(newKeys);

      // Then verify in background (optional)
      try {
        await testConnectivity(binanceKey, binanceSecret);
        toast("success", "Binance API keys saved and verified");
      } catch {
        // Keys saved but verification failed - still show success
        toast("success", "Binance API keys saved");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid API keys";
      toast("error", `Failed to save keys: ${msg}`);
    } finally {
      setIsBinanceVerifying(false);
    }
  };

  const handleSaveAI = async () => {
    // Save keys FIRST (without waiting for verification)
    const newKeys = {
      binanceApiKey: apiKeys?.binanceApiKey || "",
      binanceSecretKey: apiKeys?.binanceSecretKey || "",
      llmProvider,
      llmApiKey: llmKey || "",
      llmModel,
      llmBaseUrl,
      llmEndpoint,
      llmDeploymentName,
      squareApiKey: squareKey,
    };
    setAPIKeys(newKeys);
    await saveKeysToServer(newKeys);

    // Then verify in background
    const isValid = await verifyLLM({
      provider: llmProvider,
      apiKey: llmKey,
      model: llmModel,
      baseUrl: llmBaseUrl,
      endpoint: llmEndpoint,
      deploymentName: llmDeploymentName,
    });

    if (isValid) {
      toast("success", "AI Model settings verified & updated");
    } else {
      toast("success", "AI Model settings saved (verification optional)");
    }
  };

  const handleSaveSquare = async () => {
    if (!apiKeys) return;
    const newKeys = {
      ...apiKeys,
      squareApiKey: squareKey,
    };
    setAPIKeys(newKeys);
    await saveKeysToServer(newKeys);
    setIsEditingSquare(false);
    toast("success", squareKey ? "Square API key saved" : "Square API key removed");
  };

  const handleSavePreferences = () => {
    const investmentValue = Number(defaultInvestment);
    if (isNaN(investmentValue) || investmentValue < 1) {
      toast("error", "Minimum investment must be at least $1");
      return;
    }

    const finalAgents = Array.from(enabledAgents);
    if (!finalAgents.includes("THE_ARBITER")) finalAgents.push("THE_ARBITER");

    updatePreferences({
      riskTolerance,
      defaultInvestmentSize: investmentValue || 100,
      enabledAgents: finalAgents as AgentName[],
    });
    toast("success", "Preferences updated");
  };

  // Show loading state if keys haven't been loaded yet
  if (!apiKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500 pb-24">
      <h1 className="text-text-primary text-2xl font-bold mb-6 sm:mb-8">Settings</h1>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. BINANCE API KEYS */}
        <section className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5 border-b border-card-border pb-4">
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] text-accent rounded-full">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-text-primary font-semibold">Binance Account</h2>
              <p className="text-text-muted text-xs">Manage your read-only exchange connection</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-text-primary text-sm font-medium mb-1.5">API Key</label>
              <input
                type="text"
                value={binanceKey}
                onChange={(e) => setBinanceKey(e.target.value)}
                placeholder="Enter Binance API Key"
                className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim  font-mono text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-text-primary text-sm font-medium mb-1.5">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={binanceSecret}
                  onChange={(e) => setBinanceSecret(e.target.value)}
                  placeholder="Enter Binance Secret Key"
                  className="w-full glass-input px-4 py-3 pr-10 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-2 touch-target flex items-center justify-center"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveBinance}
                disabled={isBinanceVerifying || !binanceKey || !binanceSecret}
                className="bg-text-primary text-amoled font-bold px-5 py-2.5 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target w-full sm:w-auto justify-center"
              >
                {isBinanceVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save & Verify
              </button>
            </div>
          </div>
        </section>

        {/* 2. AI MODEL SETUP */}
        <section className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5 border-b border-card-border pb-4">
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-agent-lens),transparent_90%)] text-[var(--color-agent-lens)] rounded-full">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-text-primary font-semibold">AI Model Setup</h2>
              <p className="text-text-muted text-xs">
                Configure the Council&apos;s intelligence engine
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {(Object.keys(PROVIDER_MODELS) as LLMProvider[]).map((providerId) => (
              <div
                key={providerId}
                onClick={() => {
                  setLlmProvider(providerId);
                  resetLlmVerification();
                }}
                className={twMerge(
                  clsx(
                    "bg-card backdrop-blur-md border rounded-xl p-3 cursor-pointer transition-all text-center sm:text-left",
                    llmProvider === providerId
                      ? "border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] bg-[color-mix(in_srgb,var(--color-accent),transparent_94%)] text-text-primary font-bold"
                      : "border-card-border hover:border-card-border-hover text-text-secondary",
                  ),
                )}
              >
                <span className="text-sm">{PROVIDER_DISPLAY_NAMES[providerId]}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-text-primary text-sm font-medium mb-1.5">
                {PROVIDER_DISPLAY_NAMES[llmProvider]} API Key{" "}
                {llmProvider === "ollama" && "(Optional)"}
              </label>
              <input
                type="password"
                value={llmKey}
                onChange={(e) => {
                  setLlmKey(e.target.value);
                  resetLlmVerification();
                }}
                placeholder={llmProvider === "ollama" ? "Leave empty for default local" : "sk-..."}
                className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
              />
            </div>

            {llmProvider === "azure-openai" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1.5">
                    Azure Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={llmEndpoint}
                    onChange={(e) => {
                      setLlmEndpoint(e.target.value);
                      resetLlmVerification();
                    }}
                    placeholder="https://your-resource.openai.azure.com"
                    className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1.5">
                    Deployment Name
                  </label>
                  <input
                    type="text"
                    value={llmDeploymentName}
                    onChange={(e) => {
                      setLlmDeploymentName(e.target.value);
                      resetLlmVerification();
                    }}
                    placeholder="E.g. gpt-4o-deployment"
                    className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
                  />
                </div>
              </div>
            )}

            {["openai", "ollama", "openrouter"].includes(llmProvider) && (
              <div>
                <label className="block text-text-primary text-sm font-medium mb-1.5 capitalize">
                  Base URL {llmProvider === "openai" && "(Optional proxy)"}
                </label>
                <input
                  type="text"
                  value={llmBaseUrl}
                  onChange={(e) => {
                    setLlmBaseUrl(e.target.value);
                    resetLlmVerification();
                  }}
                  placeholder={
                    llmProvider === "ollama"
                      ? "http://localhost:11434"
                      : llmProvider === "openrouter"
                        ? "https://openrouter.ai/api/v1"
                        : "Custom endpoint"
                  }
                  className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
                />
                {llmProvider === "ollama" && (
                  <p className="text-text-muted text-xs mt-2 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      If you see <b>CORS</b> errors on Linux, run: <br />
                      <code className="bg-card px-1 py-0.5 rounded">
                        export OLLAMA_ORIGINS=&quot;*&quot; && ollama serve
                      </code>
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <Select
                label="Model"
                value={llmModel}
                onChange={(value) => {
                  setLlmModel(value);
                  resetLlmVerification();
                }}
                options={PROVIDER_MODELS[llmProvider].map((model) => ({
                  value: model,
                  label: model,
                }))}
              />
              {llmProvider === "gemini" && (
                <p className="text-text-muted text-xs mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Gemini streaming works best with gemini-3-flash. Other Gemini models may have
                  slower response times.
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-3">
              {/* Verification Feedback */}
              {llmError && (
                <div className="bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-xl px-4 py-3 flex gap-3 items-start w-full transition-all">
                  <AlertTriangle className="w-4 h-4 text-risk-extreme shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-risk-extreme text-sm font-bold mb-0.5">
                      Verification Failed
                    </p>
                    <p
                      className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-xs truncate"
                      title={llmError}
                    >
                      {llmError}
                    </p>
                  </div>
                </div>
              )}

              {isLlmVerified && (
                <div className="bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] rounded-xl px-4 py-3 flex items-center gap-2 w-full">
                  <CheckCircle2 className="w-4 h-4 text-risk-low shrink-0" />
                  <span className="text-risk-low text-sm font-medium">Connection verified ✓</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAI}
                  disabled={
                    isLlmVerifying ||
                    (!llmKey && llmProvider !== "ollama") ||
                    (llmProvider === "azure-openai" && (!llmEndpoint || !llmDeploymentName))
                  }
                  className="border border-card-border-hover text-text-primary font-bold px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-card-hover hover:text-text-primary transition-all touch-target w-full sm:w-auto justify-center"
                >
                  {isLlmVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isLlmVerifying ? "Verifying..." : "Verify & Save AI Settings"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2.5 BINANCE SQUARE KEY */}
        <section className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5 border-b border-card-border pb-4">
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-agent-pulse),transparent_90%)] text-[var(--color-agent-pulse)] rounded-full">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-text-primary font-semibold">Binance Square</h2>
              <p className="text-text-muted text-xs">
                Post Council verdicts and alerts to Binance Square
              </p>
            </div>
            {apiKeys?.squareApiKey && !isEditingSquare && (
              <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_80%)] text-[var(--color-agent-shadow)] border border-[color-mix(in_srgb,var(--color-agent-shadow),transparent_70%)]">
                Connected
              </span>
            )}
          </div>

          <div className="space-y-4">
            {apiKeys?.squareApiKey && !isEditingSquare ? (
              <div>
                <label className="block text-text-primary text-sm font-medium mb-1.5">
                  Square API Key
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-card border border-card-border rounded-xl px-4 py-3 font-mono text-sm text-text-secondary">
                    sq_{"•".repeat(16)}
                    {apiKeys.squareApiKey.slice(-4)}
                  </div>
                  <button
                    onClick={() => setIsEditingSquare(true)}
                    className="border border-card-border text-text-muted px-3 py-2.5 rounded-full text-sm hover:text-text-primary hover:border-card-border-hover transition-all"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-text-primary text-sm font-medium mb-1.5">
                  Square API Key
                </label>
                <input
                  type="password"
                  value={squareKey}
                  onChange={(e) => setSquareKey(e.target.value)}
                  placeholder="Enter X-Square-OpenAPI-Key (optional)"
                  className="w-full glass-input px-4 py-3 text-text-primary placeholder-text-dim font-mono text-sm transition-all"
                />
                <p className="text-text-muted text-xs mt-2 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Get this from Binance Square → Settings → OpenAPI. This is NOT your trading API
                  key.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveSquare}
                className="border border-card-border-hover text-text-primary font-bold px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-card-hover hover:text-text-primary transition-all touch-target w-full sm:w-auto justify-center"
              >
                <Save className="w-4 h-4" />
                {apiKeys?.squareApiKey && !isEditingSquare ? "Update" : "Save"} Square Key
              </button>
            </div>
          </div>
        </section>

        {/* 3. PREFERENCES */}
        <section className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5 border-b border-card-border pb-4">
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-agent-pulse),transparent_90%)] text-[var(--color-agent-pulse)] rounded-full">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-text-primary font-semibold">General Preferences</h2>
              <p className="text-text-muted text-xs">Risk tolerance and active agents</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Risk Tolerance */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-text-primary text-sm font-medium">Risk Tolerance</label>
                <span className="bg-card-hover px-2.5 py-0.5 rounded-full text-xs font-semibold text-text-primary">
                  {riskTolerance <= 3
                    ? "Conservative"
                    : riskTolerance <= 7
                      ? "Moderate"
                      : "Aggressive"}{" "}
                  ({riskTolerance}/10)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(Number(e.target.value))}
                className="w-full h-1.5 bg-card-hover rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between mt-2 px-1">
                <span className="text-text-secondary text-xs">Conservative</span>
                <span className="text-text-secondary text-xs">Aggressive</span>
              </div>
            </div>

            {/* Trade Size */}
            <div>
              <label className="block text-text-primary text-sm font-medium mb-1.5">
                Default Investment Size
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-text-secondary sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={defaultInvestment}
                  onChange={(e) => setDefaultInvestment(e.target.value)}
                  className="w-full glass-input pl-7 pr-4 py-3 text-text-primary text-sm transition-all"
                />
              </div>
            </div>

            {/* Agents */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Enabled Agents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(AGENTS).map((agent) => {
                  const isArbiter = agent.id === "THE_ARBITER";
                  const isEnabled = enabledAgents.has(agent.id) || isArbiter;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={twMerge(
                        clsx(
                          "flex items-center justify-between p-3 rounded-xl border transition-all",
                          isArbiter
                            ? "opacity-60 cursor-not-allowed bg-card border-card-border"
                            : "hover:border-card-border-hover cursor-pointer",
                          isEnabled && !isArbiter
                            ? "border-[color-mix(in_srgb,var(--color-accent),transparent_75%)] bg-[color-mix(in_srgb,var(--color-accent),transparent_95%)]"
                            : "border-card-border bg-card",
                        ),
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: agent.color }}
                        />
                        <span className="text-sm font-medium text-text-primary truncate">
                          {agent.displayName}
                        </span>
                      </div>

                      <div
                        className={twMerge(
                          clsx(
                            "w-8 h-4 sm:w-9 sm:h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0",
                            isEnabled ? "bg-accent" : "bg-card-border",
                          ),
                        )}
                      >
                        <div
                          className={twMerge(
                            clsx(
                              "w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-amoled transition-transform",
                              isEnabled ? "translate-x-4" : "translate-x-0",
                            ),
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 mt-3 text-text-muted text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>The Arbiter is the core consensus engine and cannot be disabled.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSavePreferences}
                className="border border-card-border-hover text-text-secondary font-bold px-5 py-2.5 rounded-full flex items-center gap-2 hover:border-card-border-hover hover:text-text-primary transition-all touch-target w-full sm:w-auto justify-center"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          </div>
        </section>

        {/* 4. TELEGRAM BOT */}
        <section className="glass-card p-6 sm:p-8">
          <TelegramBotSettings />
        </section>
      </div>
    </div>
  );
}

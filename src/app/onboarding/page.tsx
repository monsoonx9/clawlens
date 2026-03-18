"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Loader2,
  Info,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Select } from "@/components/ui/Select";
import { AgentName, LLMProvider } from "@/types/index";
import { testConnectivity } from "@/lib/binanceClient";
import { useVerifyLLM } from "@/hooks/useVerifyLLM";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AGENTS } from "@/lib/constants";
import { PROVIDER_MODELS, PROVIDER_DISPLAY_NAMES, PROVIDER_DESCRIPTIONS } from "@/lib/providers";

export default function OnboardingPage() {
  const router = useRouter();
  const { setAPIKeys, saveKeysToServer, setOnboarded, updatePreferences, isOnboarded, apiKeys } =
    useAppStore();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (isOnboarded || (apiKeys && apiKeys.llmApiKey)) {
      router.replace("/dashboard");
    }
  }, [isOnboarded, apiKeys, router]);

  // Step 1 State
  const [binanceKey, setBinanceKey] = useState("");
  const [binanceSecret, setBinanceSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isBinanceVerifying, setIsBinanceVerifying] = useState(false);
  const [isBinanceVerified, setIsBinanceVerified] = useState(false);
  const [binanceError, setBinanceError] = useState<string | null>(null);

  // Step 2 State
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("openai");
  const [llmModel, setLlmModel] = useState(PROVIDER_MODELS.openai[0]);
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmDeploymentName, setLlmDeploymentName] = useState("");
  const [llmKey, setLlmKey] = useState("");
  const {
    isVerifying,
    isVerified,
    error: llmError,
    verify: verifyLLM,
    resetVerification,
  } = useVerifyLLM();

  // Step 3 State
  const [riskTolerance, setRiskTolerance] = useState<number>(5);
  const [defaultInvestment, setDefaultInvestment] = useState<string>("100");
  const [squareKey, setSquareKey] = useState<string>("");
  const [enabledAgents, setEnabledAgents] = useState<Set<AgentName>>(
    new Set([
      "SCOUT",
      "THE_WARDEN",
      "LENS",
      "SHADOW",
      "LEDGER",
      "PULSE",
      "SAGE",
      "QUILL",
      "FUTURES",
      "BLAZE",
    ]),
  );

  const nextStep = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleVerifyBinance = async () => {
    setIsBinanceVerifying(true);
    setBinanceError(null);
    setIsBinanceVerified(false);
    try {
      const result = await testConnectivity(binanceKey, binanceSecret);
      if (result.success && result.canTrade) {
        setIsBinanceVerified(true);
      } else if (result.success) {
        setBinanceError(
          "API key does not have trading permissions. Please enable trading in your Binance API settings.",
        );
        setIsBinanceVerified(false);
      } else {
        setBinanceError(
          result.accountType === "UNKNOWN" ? "Invalid API credentials" : "Connection failed",
        );
        setIsBinanceVerified(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setBinanceError(msg);
      setIsBinanceVerified(false);
    } finally {
      setIsBinanceVerifying(false);
    }
  };

  const handleVerifyLLM = () => {
    verifyLLM({
      provider: llmProvider,
      apiKey: llmKey,
      model: llmModel,
      baseUrl: llmBaseUrl,
      endpoint: llmEndpoint,
      deploymentName: llmDeploymentName,
    });
  };

  const finishOnboarding = async () => {
    // 1. Save Keys
    const newKeys = {
      binanceApiKey: binanceKey,
      binanceSecretKey: binanceSecret,
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

    // 2. Save Preferences
    const finalAgents = Array.from(enabledAgents);
    if (!finalAgents.includes("THE_ARBITER")) finalAgents.push("THE_ARBITER");

    updatePreferences({
      riskTolerance,
      defaultInvestmentSize: Number(defaultInvestment) || 100,
      enabledAgents: finalAgents as AgentName[],
    });

    // 3. Mark Onboarded and Redirect
    setOnboarded(true);
    router.push("/dashboard");
  };

  const toggleAgent = (agent: AgentName) => {
    if (agent === "THE_ARBITER") return; // Cannot toggle arbiter
    const next = new Set(enabledAgents);
    if (next.has(agent)) next.delete(agent);
    else next.add(agent);
    setEnabledAgents(next);
  };

  const riskLabel =
    riskTolerance <= 3 ? "Conservative" : riskTolerance <= 7 ? "Moderate" : "Aggressive";

  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto w-full min-h-screen">
      <div className="max-w-lg mx-auto mt-16 mb-24 px-4 relative z-10">
        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <Image
            src="/logo_v1.webp"
            alt="ClawLens Logo"
            width={44}
            height={44}
            className="drop-shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent),transparent_70%)]"
          />
          <span className="text-text-primary font-bold text-2xl tracking-tight">ClawLens</span>
        </div>

        {/* Card */}
        <div className="glass-card p-5 sm:p-10 shadow-lg relative overflow-hidden">
          {/* Step Indicator */}
          <div className="flex justify-center items-center mb-10 relative">
            <div className="absolute top-4 left-[15%] right-[15%] h-0.5 bg-card-border z-0" />

            {[1, 2, 3].map((num) => {
              const isActive = step === num;
              const isCompleted = step > num;

              return (
                <div key={num} className="flex-1 flex flex-col items-center z-10">
                  <div
                    className={twMerge(
                      clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300",
                        isActive && "bg-accent text-amoled shadow-glow-accent",
                        isCompleted &&
                          "bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)] text-accent border border-accent",
                        !isActive && !isCompleted && "bg-card text-text-muted",
                      ),
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : num}
                  </div>
                  <span
                    className={twMerge(
                      clsx(
                        "text-[10px] sm:text-xs mt-2 font-medium transition-colors duration-300",
                        isActive || isCompleted ? "text-text-primary" : "text-text-muted",
                      ),
                    )}
                  >
                    {num === 1 ? "Binance Keys" : num === 2 ? "AI Setup" : "Preferences"}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {/* ------------ STEP 1: BINANCE ------------ */}
              {step === 1 && (
                <div>
                  <h2 className="text-text-primary text-xl sm:text-[22px] font-bold mb-1">
                    Connect Your Binance Account
                  </h2>
                  <p className="text-text-secondary text-xs sm:text-sm mb-6">
                    Read-only access recommended. Never enable withdrawal permissions.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-text-primary text-sm font-medium mb-1.5">
                        Binance API Key
                      </label>
                      <input
                        type="text"
                        value={binanceKey}
                        onChange={(e) => setBinanceKey(e.target.value)}
                        placeholder="Enter your Binance API Key"
                        className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-text-primary text-sm font-medium mb-1.5">
                        Binance Secret Key
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={binanceSecret}
                          onChange={(e) => setBinanceSecret(e.target.value)}
                          placeholder="Enter your Binance Secret Key"
                          className="w-full glass-input px-4 py-3 pr-10 placeholder-text-dim font-mono text-sm transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-2 touch-target flex items-center justify-center"
                        >
                          {showSecret ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent-bg border-l-4 border-accent rounded-xl p-4 mt-6 flex gap-3">
                    <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p className="text-text-secondary text-sm leading-relaxed">
                      Your keys are stored only in your browser&apos;s session memory. They are
                      never transmitted to any server operated by ClawLens. Clearing your browser
                      session removes them permanently.
                    </p>
                  </div>

                  <a
                    href="https://www.binance.com/en/support/faq/how-to-create-api-360002502072"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent text-sm hover:underline mt-4 block"
                  >
                    How to create a read-only Binance API key &rarr;
                  </a>

                  {/* Verify Connection Button */}
                  <button
                    onClick={handleVerifyBinance}
                    disabled={
                      !binanceKey.trim() ||
                      !binanceSecret.trim() ||
                      isBinanceVerifying ||
                      isBinanceVerified
                    }
                    className="w-full border border-card-border-hover text-text-primary disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-full mt-6 hover:bg-card-hover transition-all flex items-center justify-center gap-2 touch-target"
                  >
                    {isBinanceVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                    {!isBinanceVerifying && isBinanceVerified && (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {!isBinanceVerifying && binanceError && <XCircle className="w-4 h-4" />}
                    {isBinanceVerifying
                      ? "Verifying..."
                      : isBinanceVerified
                        ? "Connected"
                        : binanceError
                          ? "Retry"
                          : "Verify Connection"}
                  </button>

                  {/* Connection result */}
                  {isBinanceVerified && (
                    <div className="mt-3 bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-risk-low shrink-0" />
                      <span className="text-risk-low text-sm">
                        Successfully connected to Binance API
                      </span>
                    </div>
                  )}
                  {binanceError && (
                    <div className="mt-4 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-xl p-4 flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 text-risk-extreme shrink-0 mt-0.5" />
                      <div>
                        <p className="text-risk-extreme text-sm font-bold mb-1">
                          Connection Failed
                        </p>
                        <p className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-xs leading-relaxed">
                          {binanceError}
                        </p>
                        <p className="text-text-muted text-[10px] mt-2">
                          Please check your keys and ensure your IP is whitelisted if applicable.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={nextStep}
                    disabled={!isBinanceVerified}
                    className="w-full bg-text-primary disabled:opacity-50 disabled:cursor-not-allowed text-amoled font-bold py-3.5 rounded-full mt-4 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* ------------ STEP 2: AI SETUP ------------ */}
              {step === 2 && (
                <div>
                  <h2 className="text-text-primary text-xl sm:text-[22px] font-bold mb-6">
                    Configure Your AI Model
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {(Object.keys(PROVIDER_MODELS) as LLMProvider[]).map((providerId) => {
                      const isSelected = llmProvider === providerId;
                      return (
                        <div
                          key={providerId}
                          onClick={() => {
                            setLlmProvider(providerId);
                            setLlmModel(PROVIDER_MODELS[providerId][0]);
                            resetVerification();
                          }}
                          className={twMerge(
                            clsx(
                              "bg-card backdrop-blur-md border rounded-xl p-3 cursor-pointer transition-all",
                              isSelected
                                ? "border-accent bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)]"
                                : "border-card-border hover:border-card-border-hover",
                            ),
                          )}
                        >
                          <div className="text-text-primary font-bold text-sm mb-0.5">
                            {PROVIDER_DISPLAY_NAMES[providerId]}
                          </div>
                          <div className="text-text-muted text-[11px] leading-tight">
                            {PROVIDER_DESCRIPTIONS[providerId]}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 mb-6">
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
                          resetVerification();
                        }}
                        placeholder={
                          llmProvider === "ollama" ? "Leave empty for default local" : "sk-..."
                        }
                        className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm"
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
                              resetVerification();
                            }}
                            placeholder="https://your-resource.openai.azure.com"
                            className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm transition-all"
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
                              resetVerification();
                            }}
                            placeholder="E.g. gpt-4o"
                            className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm transition-all"
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
                            resetVerification();
                          }}
                          placeholder={
                            llmProvider === "ollama"
                              ? "http://localhost:11434"
                              : llmProvider === "openrouter"
                                ? "https://openrouter.ai/api/v1"
                                : "Custom endpoint"
                          }
                          className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm transition-all"
                        />
                      </div>
                    )}

                    <div>
                      <Select
                        label="Model"
                        value={llmModel}
                        onChange={setLlmModel}
                        options={PROVIDER_MODELS[llmProvider].map((model) => ({
                          value: model,
                          label: model,
                        }))}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyLLM}
                    disabled={
                      (!llmKey.trim() && llmProvider !== "ollama") ||
                      (llmProvider === "azure-openai" && (!llmEndpoint || !llmDeploymentName)) ||
                      isVerifying ||
                      isVerified
                    }
                    className="w-full border border-card-border-hover text-text-primary disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-full hover:bg-card-hover transition-all flex items-center justify-center gap-2 touch-target mt-6 sm:mt-0"
                  >
                    {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                    {!isVerifying && isVerified && <CheckCircle2 className="w-4 h-4" />}
                    {isVerifying
                      ? "Verifying..."
                      : isVerified
                        ? "Connection Verified"
                        : "Verify Connection"}
                  </button>

                  {/* Verification error */}
                  {llmError && (
                    <div className="mt-4 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-xl p-4 flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 text-risk-extreme shrink-0 mt-0.5" />
                      <div>
                        <p className="text-risk-extreme text-sm font-bold mb-1">
                          Verification Failed
                        </p>
                        <p className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-xs leading-relaxed">
                          {llmError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verification success */}
                  {isVerified && (
                    <div className="mt-3 bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-risk-low shrink-0" />
                      <span className="text-risk-low text-sm">Connection verified ✓</span>
                    </div>
                  )}

                  <button
                    onClick={nextStep}
                    disabled={!llmKey.trim() || (llmProvider !== "ollama" && !isVerified)}
                    className="w-full bg-text-primary disabled:opacity-50 disabled:cursor-not-allowed text-amoled font-bold py-3.5 rounded-full mt-4 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target"
                  >
                    {!llmKey.trim() ? "Enter API Key" : "Continue"}
                  </button>
                  {llmKey.trim() && llmProvider !== "ollama" && !isVerified && (
                    <p className="text-text-muted text-xs mt-2 text-center">
                      Click &quot;Verify Connection&quot; above to test your settings before
                      continuing
                    </p>
                  )}
                </div>
              )}

              {/* ------------ STEP 3: PREFERENCES ------------ */}
              {step === 3 && (
                <div>
                  <h2 className="text-text-primary text-xl sm:text-[22px] font-bold mb-6">
                    Set Your Risk Profile
                  </h2>

                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                      <label className="text-text-primary text-sm font-medium">
                        Risk Tolerance
                      </label>
                      <span className="bg-card-border px-2.5 py-0.5 rounded-full text-xs font-semibold text-text-primary">
                        {riskLabel} ({riskTolerance}/10)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(Number(e.target.value))}
                      className="w-full h-1.5 bg-card-border rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <div className="flex justify-between mt-2 px-1">
                      <span className="text-text-secondary text-xs">Conservative</span>
                      <span className="text-text-secondary text-xs">Aggressive</span>
                    </div>
                  </div>

                  <div className="mb-8 border-b border-card-border pb-8">
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
                        className="w-full glass-input pl-7 pr-4 py-3 text-sm"
                      />
                    </div>
                    <p className="text-text-muted text-xs mt-2">Maximum amount per trade in USD</p>
                  </div>

                  <div className="mb-8 border-b border-card-border pb-8">
                    <label className="block text-text-primary text-sm font-medium mb-1.5">
                      Binance Square API Key{" "}
                      <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={squareKey}
                      onChange={(e) => setSquareKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full glass-input px-4 py-3 placeholder-text-dim font-mono text-sm"
                    />
                    <p className="text-text-muted text-xs mt-2">
                      Required only if you want to use the automated Square Briefing posts feature.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                      Enable Council Agents
                    </h3>

                    <div className="space-y-1 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      {Object.values(AGENTS).map((agentConfig) => {
                        const agent = agentConfig.id;
                        const isArbiter = agent === "THE_ARBITER";
                        const isEnabled = enabledAgents.has(agent) || isArbiter;

                        return (
                          <div
                            key={agent}
                            onClick={() => toggleAgent(agent)}
                            className={twMerge(
                              clsx(
                                "flex items-center justify-between p-2 rounded-xl transition-all",
                                isArbiter
                                  ? "opacity-70 cursor-not-allowed bg-card"
                                  : "hover:bg-card-hover cursor-pointer",
                              ),
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: agentConfig.color }}
                              />
                              <span className="text-sm font-medium text-text-primary">
                                {agentConfig.displayName}
                              </span>
                            </div>

                            {/* Custom Toggle */}
                            <div
                              className={twMerge(
                                clsx(
                                  "w-9 h-5 rounded-full flex items-center px-0.5 transition-colors",
                                  isEnabled ? "bg-accent" : "bg-card-border",
                                ),
                              )}
                            >
                              <div
                                className={twMerge(
                                  clsx(
                                    "w-4 h-4 rounded-full bg-amoled shadow-sm transition-transform",
                                    isEnabled ? "translate-x-4" : "translate-x-0",
                                  ),
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-start gap-2 mt-4 text-text-muted text-xs">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>The Arbiter is always enabled as Council Head.</p>
                    </div>
                  </div>

                  <button
                    onClick={finishOnboarding}
                    className="w-full bg-accent text-amoled font-bold py-3.5 flex items-center justify-center gap-2 rounded-full mt-8 hover:scale-105 active:scale-95 hover:shadow-glow-accent transition-all touch-target"
                  >
                    Launch ClawLens
                    <Image src="/logo_v1.webp" alt="Launch Logo" width={20} height={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

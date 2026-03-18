"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import {
  ShieldCheck,
  Users,
  BookOpen,
  BarChart2,
  Search,
  Rocket,
  Wallet,
  TrendingUpIcon,
} from "lucide-react";
import { useReducedMotion, getTransition } from "@/hooks/useReducedMotion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LandingPage() {
  const prefersReduced = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: prefersReduced ? { duration: 0 } : { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto w-full min-h-screen scroll-smooth">
      {/* Background Mesh Gradient */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--color-agent-shadow), transparent 92%) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, color-mix(in srgb, var(--color-agent-lens), transparent 94%) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 20% 80%, color-mix(in srgb, var(--color-agent-quill), transparent 95%) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 60% 60%, color-mix(in srgb, var(--color-agent-pulse), transparent 96%) 0%, transparent 50%)
          `,
        }}
      />

      {/* NAVBAR — Floating pill */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-strong rounded-full px-6 py-2.5 flex items-center gap-6 shadow-[0_8px_32px_color-mix(in_srgb,var(--color-bg),black_15%)] dark:shadow-[0_8px_32px_color-mix(in_srgb,var(--color-bg),black_40%)]">
          <div className="flex items-center gap-2">
            <Image
              src="/logo_v1.webp"
              alt="ClawLens"
              width={24}
              height={24}
              className="logo-glow"
            />
            <span className="text-text-primary font-bold text-sm tracking-tight">ClawLens</span>
            <span className="bg-accent/20 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-accent/20">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/onboarding"
              className="bg-text-primary text-amoled font-bold px-4 py-1.5 rounded-full text-xs hover:scale-105 active:scale-95 hover:bg-text-secondary transition-all"
            >
              Launch
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-16">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--color-risk-moderate), transparent 94%) 0%, transparent 60%)",
          }}
        />

        <div className="content-center text-center max-w-2xl mx-auto px-6 relative z-10">
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={getTransition(
              { type: "spring", stiffness: 200, damping: 15 },
              prefersReduced,
            )}
          >
            <div className="logo-container">
              <Image
                src="/logo_v1.webp"
                alt="ClawLens Hero Logo"
                width={96}
                height={96}
                className="logo-glow"
                priority
              />
            </div>
          </motion.div>

          <motion.h1
            className="text-6xl font-extrabold text-text-primary tracking-tight leading-tight flex items-start justify-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getTransition({ delay: 0.2, duration: 0.5 }, prefersReduced)}
          >
            ClawLens
            <span className="text-sm font-bold bg-accent/20 text-accent px-3 py-1 rounded-full uppercase tracking-widest mt-2 border border-accent/20 shadow-[0_0_15px_color-mix(in_srgb,var(--color-accent),transparent_80%)]">
              Beta
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-text-secondary mt-4 mb-4 font-medium"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getTransition({ delay: 0.35, duration: 0.5 }, prefersReduced)}
          >
            Don&apos;t ask one AI. Ask the Council.
          </motion.p>

          <motion.div
            className="text-sm text-yellow-500/90 mb-8 max-w-lg mx-auto border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 rounded-xl shadow-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getTransition({ delay: 0.4, duration: 0.5 }, prefersReduced)}
          >
            ClawLens is currently in <b>Beta</b> and under active continuous development. Some
            features may be temporarily limited as I rapidly improve the platform.
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getTransition({ delay: 0.5, duration: 0.5 }, prefersReduced)}
          >
            <Link
              href="/onboarding"
              className="w-full sm:w-auto bg-text-primary text-amoled font-bold px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all text-center"
            >
              Launch App
            </Link>
            <Link
              href="https://github.com/monsoonx9/clawlens"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto glass hover:glass-strong text-text-secondary px-8 py-3.5 rounded-full hover:border-card-border-hover hover:text-text-primary transition-all text-center font-medium"
            >
              View on GitHub
            </Link>
          </motion.div>

          <motion.p
            className="text-text-muted text-sm mt-8 max-w-md mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getTransition({ delay: 0.65, duration: 0.5 }, prefersReduced)}
          >
            Requires your own Binance API key and LLM API key. <br className="hidden sm:block" />
            Your keys never leave your device.
          </motion.p>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-accent text-sm font-bold tracking-widest uppercase text-center mb-3"
          >
            WHAT CLAWLENS DOES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-text-primary text-3xl md:text-4xl font-bold text-center mb-16"
          >
            One platform. Eleven experts.
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {[
              {
                icon: Search,
                colorClass: "text-risk-low",
                title: "Market Discovery",
                desc: "Real-time trending tokens, Binance Alpha picks, and smart money inflow rankings from Binance's official API.",
              },
              {
                icon: Rocket,
                colorClass: "text-risk-high",
                title: "Meme Rush",
                desc: "Discover new meme tokens from Pump.fun, Four.meme, and other launchpads. Track bonding curve progress and migration status.",
              },
              {
                icon: TrendingUpIcon,
                colorClass: "text-accent-shadow",
                title: "Smart Money Signals",
                desc: "Live on-chain signals when professional traders accumulate. Track smart money direction before the market follows.",
              },
              {
                icon: ShieldCheck,
                colorClass: "text-risk-extreme",
                title: "Token Audit",
                desc: "Official Binance security audit. Detect honeypots, trading taxes, and contract risks before you trade.",
              },
              {
                icon: Wallet,
                colorClass: "text-accent-ledger",
                title: "Wallet Tracker",
                desc: "Query any on-chain wallet. View token holdings, balances, and portfolio value across BSC, Base, and Solana.",
              },
              {
                icon: Users,
                colorClass: "text-risk-moderate",
                title: "Claw Council",
                desc: "11 specialized AI agents each analyze your query from their unique expert perspective before The Arbiter delivers a final verdict.",
              },
              {
                icon: BookOpen,
                colorClass: "text-accent-pulse",
                title: "Trade Journal",
                desc: "Your AI coach learns from your own trading history and identifies behavioral patterns that are costing you money.",
              },
              {
                icon: BarChart2,
                colorClass: "text-accent-lens",
                title: "Portfolio Pulse",
                desc: "Real-time portfolio health, DCA planning, and rebalancing suggestions connected directly to your Binance account.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={getTransition(
                  { duration: 0.4, ease: "easeOut", delay: i * 0.08 },
                  prefersReduced,
                )}
                className="glass-card p-8 min-h-[240px] hover:-translate-y-2 transition-all duration-300 group flex flex-col"
              >
                <feature.icon
                  className={`w-8 h-8 ${feature.colorClass} mb-5 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_currentColor]`}
                />
                <h3 className="text-text-primary font-bold tracking-tight text-xl mb-3">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed flex-1">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AGENT SHOWCASE */}
      <section className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-text-primary text-3xl md:text-3xl font-bold mb-4">
              Meet the Claw Council
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Each agent has a different agenda. The Arbiter makes sense of it all.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {[
              {
                name: "SCOUT",
                role: "Market Discovery",
                color: "var(--color-risk-low)",
                desc: "Always searching for the next undervalued gem.",
              },
              {
                name: "THE WARDEN",
                role: "Risk & Security",
                color: "var(--color-risk-extreme)",
                desc: "Paranoid deeply. Sees scams everywhere.",
              },
              {
                name: "LENS",
                role: "Token Intelligence",
                color: "var(--color-accent-lens)",
                desc: "Obsessed with tokenomics and supply dynamics.",
              },
              {
                name: "SHADOW",
                role: "Smart Money",
                color: "var(--color-accent-shadow)",
                desc: "Follows the wallets of the 0.1% silently.",
              },
              {
                name: "LEDGER",
                role: "Portfolio Manager",
                color: "var(--color-accent-ledger)",
                desc: "Cold, calculating, and focused on capital preservation.",
              },
              {
                name: "PULSE",
                role: "Sentiment & Narrative",
                color: "var(--color-accent-pulse)",
                desc: "Taps into the emotional volatility of the crowd.",
              },
              {
                name: "SAGE",
                role: "Education & Guidance",
                color: "var(--color-agent-sage)",
                desc: "Patiently explains the 'why' behind the 'what'.",
              },
              {
                name: "QUILL",
                role: "Trade Historian",
                color: "var(--color-risk-high)",
                desc: "Remembers your past mistakes so you don't repeat them.",
              },
              {
                name: "FUTURES",
                role: "Derivatives & Leverage",
                color: "var(--color-agent-futures)",
                desc: "Analyzes funding rates, open interest, and perpetual market dynamics.",
              },
              {
                name: "BLAZE",
                role: "BSC & BNB Chain",
                color: "var(--color-agent-blaze)",
                desc: "Tracks BSC DeFi, token burns, and on-chain activity across BNB Chain.",
              },
              {
                name: "THE ARBITER",
                role: "Council Head",
                color: "var(--color-risk-moderate)",
                desc: "Synthesizes the chaos. Delivers the final verdict.",
              },
            ].map((agent, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="glass-card p-5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center"
                style={{ borderLeftWidth: "4px", borderLeftColor: agent.color }}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold tracking-wide" style={{ color: agent.color }}>
                    {agent.name}
                  </h3>
                  <span className="text-xs text-text-secondary font-medium px-2.5 py-0.5 bg-card-border rounded-full backdrop-blur-md">
                    {agent.role}
                  </span>
                </div>
                <p className="text-text-muted text-sm italic">&quot;{agent.desc}&quot;</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 text-center relative z-10">
        <div className="max-w-2xl mx-auto px-6">
          <h4 className="text-accent font-bold text-xl mb-1 flex items-center justify-center gap-2">
            <Image
              src="/logo_v1.webp"
              alt="ClawLens Footer Logo"
              width={24}
              height={24}
              className="drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-risk-moderate),transparent_70%)]"
            />{" "}
            ClawLens
          </h4>
          <p className="text-text-secondary mb-6 text-sm">
            Open source and community-driven. View on GitHub.
          </p>

          <div className="h-px w-24 bg-card-border mx-auto mb-6" />

          <p className="text-text-dim text-xs leading-relaxed max-w-xl mx-auto">
            ClawLens is an educational and analytical tool. Nothing here constitutes financial
            advice. Cryptocurrency trading involves significant risk of loss and is not suitable for
            all investors. Always do your own research.
          </p>
        </div>
      </footer>
    </div>
  );
}

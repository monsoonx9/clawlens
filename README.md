<div align="center">

```text
   _____.__                 .____
  /  _  \  | _____  _  __   |    |    ____   ____  ______
 /  /_\  \ |  \__  \_ \/ \_  |    |  _/ __ \ /    \/  ___/
/    |    \  /\ \_ \  \/ \/  |    |__\  ___/|   |  \___ \
\____|__  /____(____  /\___/ |_______ \___  >___|  /____  >
        \/          \/               \/   \/     \/     \/
```

### Don't Ask One AI. Ask The Council.

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Beta](https://img.shields.io/badge/Status-Beta-orange?style=for-the-badge)]()

**ClawLens** is an intelligent, multi-agent crypto analysis platform that connects to your Binance account and deploys a "Council" of 11 specialized AI agents to analyze your portfolio and the market — plus a Personal AI Assistant and a Telegram bot for on-the-go access.

> ⚠️ **Beta Notice**: ClawLens is under active development. Some features may be temporarily limited as I rapidly improve the platform.

[View Live Demo](https://clawlens-beta.vercel.app) · [Report Bug](https://github.com/monsoonx9/clawlens/issues) · [Request Feature](https://github.com/monsoonx9/clawlens/issues)

</div>

---

## Table of Contents

- [Why ClawLens?](#why-clawlens)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Step-by-Step Usage Guide](#step-by-step-usage-guide)
- [Supported LLM Providers](#supported-llm-providers)
- [Deployment](#deployment)
- [Security](#security)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Why ClawLens?

Traditional crypto analysis tools rely on a single AI model, which can miss important context or provide biased insights. ClawLens solves this by using a **multi-agent system** where 10 specialized AI agents analyze your queries from different perspectives, with "The Arbiter" synthesizing their findings into a comprehensive verdict.

### The Problem

- Single AI models often miss critical signals or give one-directional analysis
- No context-aware portfolio analysis tied to your actual holdings
- Limited market intelligence — you have to check multiple sources manually
- No unified view of risks and opportunities across spot, futures, and on-chain

### The Solution

ClawLens brings together:

- **11 specialized agents** (10 council members + The Arbiter) with distinct expertise and personalities
- **56+ integrated skills** for real-time data fetching from Binance APIs and on-chain sources
- **Real-time Binance data** integration (spot, futures, and on-chain via Web3 API)
- **Personal AI Assistant** ("Claw") with full access to all 56+ skills for direct conversations
- **Telegram Bot** for real-time AI conversations on the go
- **Consensus detection** to identify agreement (or disagreement) across agents
- **Risk assessment** from multiple angles — security, market, portfolio, and sentiment

---

## Features

### 🏛️ The Council (11 Agents)

When you ask the Council a question, The Arbiter selects 3-6 relevant agents based on your query. Each agent independently analyzes the question using their specialized skills, then The Arbiter synthesizes all reports into a final verdict with confidence scoring.

| Agent           | Role                   | Focus Area                                          |
| --------------- | ---------------------- | --------------------------------------------------- |
| **SCOUT**       | Market Discovery       | Trending tokens, gainers/losers, market overview    |
| **THE WARDEN**  | Risk & Security        | Token audits, contract security, rug pull detection |
| **LENS**        | Token Intelligence     | Technical analysis, tokenomics, order book depth    |
| **SHADOW**      | Smart Money            | Whale tracking, on-chain signals, wallet analysis   |
| **LEDGER**      | Portfolio Manager      | Portfolio health, P&L, DCA planning                 |
| **PULSE**       | Sentiment & Narrative  | Fear index, market sentiment, volume analysis       |
| **SAGE**        | Education & Guidance   | Explain concepts using your portfolio context       |
| **QUILL**       | Trade Historian        | Trade history analysis, behavioral patterns         |
| **FUTURES**     | Derivatives & Leverage | Funding rates, open interest, perpetual markets     |
| **BLAZE**       | BSC & BNB Chain        | On-chain DeFi, token burns, BSC wallet tracking     |
| **THE ARBITER** | Council Head           | Synthesizes all reports into final verdict          |

### 🤖 Personal AI Assistant (Claw)

A full-featured AI assistant that can access **all 56+ skills** directly:

- Natural language conversations about your portfolio, market data, and on-chain analytics
- Dynamic skill routing — automatically detects which tools to invoke based on your message using TF-IDF token matching
- Conversation history stored in Supabase (persists across sessions)
- Customizable personality (Friendly, Professional, Adaptive, Technical)

### 📱 Telegram Bot

Real-time AI conversations directly in Telegram:

- **Web Account Linking** — Use `/link` to securely connect your web session to Telegram
- **Conversation Memory** — Remembers the last 10 messages for context-aware chat
- **Native Experience** — Typing indicators and seamless integration
- `/portfolio` — Full portfolio summary with risk scoring
- `/price BTC` — Live price with 24h change and volume
- `/ask [question]` — Ask anything about crypto
- Automatically inherits your API keys from the web dashboard

### 📊 Market Intelligence

- **Trending Tokens** — Real-time trending, social hype, and alpha rankings from Binance
- **Meme Rush** — New token launches from Pump.fun, Four.meme, and other launchpads
- **Exchange Stats** — Top gainers, losers, most volatile pairs
- **Technical Indicators** — SMA, EMA, MACD, RSI, Bollinger Bands
- **Order Book Analysis** — Liquidity zones, spoofing detection, bid/ask imbalance
- **Volume Analysis** — Volume spikes, buy/sell pressure, unusual activity
- **Futures Data** — Funding rates, open interest, position ratios, basis spread

### 💼 Portfolio Tools

- **Portfolio Pulse** — Real-time holdings, P&L, FIFO cost basis from your Binance account
- **Trade Journal** — Win rate, profit factor, behavioral pattern analysis
- **DCA Strategist** — Dollar-cost averaging plan generation
- **Price Alerts** — Create and manage price alerts (persisted in Supabase)

### 🛡️ Risk & Security

- **Token Audit** — Contract security analysis via Binance Web3 API
- **Rug Shield** — Comprehensive risk scoring: honeypot detection, trading taxes, ownership analysis
- **Fear Index** — Multi-factor sentiment scoring (price action, volume, social, derivatives)
- **Address Lookup** — Query any wallet for holdings across BSC, Base, and Solana

### 🐋 Smart Money Tracking

- **Whale Radar** — Large wallet tracking with consensus detection
- **Trading Signals** — On-chain smart money signals from Binance Web3
- **Whale Footprint** — Large trade tracking, unusual order detection
- **Smart Accumulation** — Institutional accumulation pattern detection
- **Smart Money Radar** — Smart money flow direction analysis

### 🔗 BSC On-Chain Analytics (10 Skills)

- BSC Wallet Tracker, Transaction Analyzer, Block Explorer
- Token On-Chain data (holders, transfers, supply)
- NFT Portfolio analysis, Contract Reader
- Whale Movement tracking, Sniper Detector
- Wallet Cluster analysis, Burn Tracker

### 🔮 Advanced Futures Analytics (14 Skills)

- Funding Heatmap, Funding Extremes, Funding History
- Taker Pressure, OI Surge, Basis Spread
- Volatility Rank, Market Regime detection
- Candlestick Patterns, Correlation Matrix
- DCA Backtester, Market Impact estimation

---

## Architecture

```
                          ┌──────────┐
                          │   USER   │
                          └────┬─────┘
                    ┌──────────┼──────────┐
               [Web]▼                     ▼ [Web / Telegram]
          ┌──────────────────┐   ┌──────────────────┐
          │   THE ARBITER    │   │ PERSONAL ASSISTANT│
          │   (Council Head) │   │     (Claw)        │
          └────────┬─────────┘   └────────┬──────────┘
                   │ Routes to            │ Routes to
                   │ 3-6 agents           │ 56+ skills
       ┌───────────┼───────────┐          │
       ▼           ▼           ▼          ▼
    ┌──────┐  ┌───────┐  ┌──────┐   ┌────────────┐
    │SCOUT │  │WARDEN │  │ LENS │   │ SKILL      │
    │ ...  │  │ ...   │  │ ...  │   │ REGISTRY   │
    └──┬───┘  └───┬───┘  └──┬───┘   └──────┬─────┘
       │          │          │             │
       └──────────┴──────────┘             │
                  │ Reports                │
                  ▼                        │
        ┌──────────────────┐               │
        │   THE ARBITER    │               │
        └────────┬─────────┘               │
                 │ Final Verdict           │
                 ▼                         ▼
            ┌──────────┐             ┌──────────┐
            │   WEB    │             │   WEB/   │
            │   USER   │             │ TELEGRAM │
            └──────────┘             └──────────┘
```

### Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org/) (App Router)  |
| Language    | [TypeScript](https://www.typescriptlang.org/)    |
| Styling     | [Tailwind CSS](https://tailwindcss.com/) + Custom CSS Variables |
| State       | [Zustand](https://zustand-demo.pmnd.rs/)         |
| Database    | [Supabase](https://supabase.com/) (PostgreSQL)   |
| Key Storage | [Upstash Redis](https://upstash.com/) (AES-256 encrypted) |
| Blockchain  | [Viem](https://viem.sh/) (BSC RPC)               |
| Animations  | [Framer Motion](https://www.framer.com/motion/)  |
| Charts      | [Recharts](https://recharts.org/)                 |
| Testing     | [Vitest](https://vitest.dev/)                     |

---

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed ([download](https://nodejs.org/))
- A **Binance Account** with an API Key ([how to create one](https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072))
  - **Read-Only permissions recommended** — ClawLens never needs trade access
- An **LLM API Key** from any supported provider (OpenAI, Anthropic, Groq, Gemini, etc.)
- An **[Upstash Redis](https://upstash.com/)** account (free tier works fine — used for encrypted key storage and caching)
- A **[Supabase](https://supabase.com/)** project (free tier works — used for chat history, alerts, and Telegram connections)

### 1. Clone and Install

```bash
git clone https://github.com/monsoonx9/clawlens.git
cd clawlens
npm install
```

### 2. Set Up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/) and create a new Redis database
2. Copy the **REST URL** and **REST Token** from the database details page

### 3. Set Up Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/) and create a new project
2. Copy the **Project URL** and **Anon Key** from Settings → API
3. Copy the **Service Role Key** from Settings → API (scroll down to service_role)
4. Open the SQL Editor in Supabase and run the schema file:

```bash
# The schema file is in the project root
cat supabase-schema.sql
# Copy the contents and paste into Supabase SQL Editor, then run it
```

### 4. Configure Environment Variables

```bash
# Copy the example config
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Vault Secret — encrypts API keys at rest
# Generate: openssl rand -base64 32
VAULT_SECRET=your-super-secure-vault-secret-min-32-chars

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (set this to your Vercel URL after deploying, or localhost for dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll land on the homepage — click **Launch App** to begin the onboarding flow.

### Available Scripts

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `npm run dev`    | Start development server           |
| `npm run build`  | Build for production                |
| `npm run start`  | Start production server             |
| `npm run lint`   | Run ESLint                          |
| `npm run format` | Format code with Prettier           |
| `npm test`       | Run tests (Vitest)                  |
| `npm run test:watch` | Run tests in watch mode         |

---

## Step-by-Step Usage Guide

### Onboarding (First-Time Setup)

1. **Launch the app** → Click "Launch App" on the landing page
2. **Enter your Binance API Key** → Paste your read-only API key and secret
   - Your keys are encrypted with AES-256 before being stored in Redis
3. **Choose your LLM Provider** → Select from 9 supported providers and enter your API key
4. **Configure agents** → Choose which of the 11 agents to enable (all enabled by default)
5. **Done!** → You're redirected to the Dashboard

### Using the Dashboard

The Dashboard gives you an at-a-glance view of your portfolio and the market:

- **Portfolio Overview** — Your total balance, P&L, and asset distribution
- **Market Summary** — BTC/ETH prices, Fear & Greed index, market dominance
- **Quick Actions** — Jump to Council, Assistant, or Web3 search

### Using the Council

This is the core feature of ClawLens:

1. Go to **Council** from the sidebar
2. **Type your question** — e.g., "Should I buy SOL right now?" or "Analyze my portfolio risk"
3. **Watch the agents work** — The Arbiter selects 3-6 relevant agents who each analyze independently
4. **Read the reports** — Each agent provides their perspective with real data from their skills
5. **See the verdict** — The Arbiter synthesizes everything into a final recommendation with confidence scores
6. **Check consensus** — The ConsensusGauge shows how much the agents agree or disagree

**Example queries to try:**
- "What are the top trending tokens right now?"
- "Is PEPE a safe investment?"
- "Analyze my portfolio and suggest rebalancing"
- "What's the smart money doing with ETH?"
- "Show me the funding rate heatmap for top futures pairs"

### Using the Personal Assistant

1. Go to **Assistant** from the sidebar
2. Chat naturally — "What's my portfolio worth?" or "Show me BTC technical indicators"
3. The assistant automatically routes to the right skill (out of 56+) based on your message
4. Conversations are saved and persist across sessions

### Using Web3 Search

1. Go to **Web3** from the sidebar
2. Search for any token by name or contract address
3. View token audit results, security scores, and on-chain data
4. Check wallet balances and track addresses

### Setting Up the Telegram Bot

1. Go to **Settings** → **Telegram** tab
2. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram (`/newbot`)
3. Copy the bot token and paste it in Settings
4. Click **Link** — this connects your web session to your Telegram bot
5. Start chatting with your bot! It has access to all your configured API keys

### Using Analytics

1. Go to **Analytics** from the sidebar
2. View your trading performance metrics — win rate, profit factor, Sharpe ratio
3. See behavioral pattern analysis from your trade history
4. Track your portfolio growth over time

---

## Supported LLM Providers

ClawLens supports 9 LLM providers. You only need **one** API key to get started:

| Provider     | Default Model                 | Get API Key                                     |
| ------------ | ----------------------------- | ----------------------------------------------- |
| OpenAI       | gpt-5.4                       | [platform.openai.com](https://platform.openai.com/) |
| Anthropic    | claude-sonnet-4-6             | [console.anthropic.com](https://console.anthropic.com/) |
| Groq         | llama-3.3-70b-versatile       | [console.groq.com](https://console.groq.com/) |
| Gemini       | gemini-3.1-flash-lite-preview | [aistudio.google.com](https://aistudio.google.com/) |
| Azure OpenAI | gpt-5.4                       | [azure.microsoft.com](https://azure.microsoft.com/en-us/products/ai-services/openai-service) |
| Ollama       | deepseek-r1                   | [ollama.com](https://ollama.com/) (local, free) |
| OpenRouter   | openai/gpt-5.4                | [openrouter.ai](https://openrouter.ai/) |
| MiniMax      | MiniMax-M2.5                  | [minimaxi.com](https://www.minimaxi.com/) |
| Ollama Cloud | qwen3-coder:480b-cloud        | [ollama.com/cloud](https://ollama.com/) |

> **💡 Tip**: For the best experience, I recommend **Groq** (fast and free tier available) or **Gemini** (generous free tier). For highest quality analysis, use **OpenAI** or **Anthropic**.

---

## Deployment

### Vercel (Recommended)

ClawLens is designed to deploy seamlessly on Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

1. Connect your GitHub repository
2. Set all environment variables in the Vercel dashboard (Settings → Environment Variables)
3. Update `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
4. Deploy!

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md).

### Environment Variables Reference

| Variable                        | Required | Description                                           |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`        | ✅ Yes   | Upstash Redis REST URL for encrypted key storage      |
| `UPSTASH_REDIS_REST_TOKEN`      | ✅ Yes   | Upstash Redis REST Token                              |
| `VAULT_SECRET`                  | ✅ Yes   | AES-256 encryption key for API keys (min 32 chars). Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ Yes   | Supabase Project URL                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes   | Supabase Anon (public) Key                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅ Yes   | Supabase Service Role Key (server-side only)          |
| `NEXT_PUBLIC_APP_URL`           | Optional | Production URL (required for Telegram webhooks)       |
| `CRON_SECRET`                   | Optional | Secret for authenticating cron job endpoints          |

---

## Security

ClawLens takes security seriously — especially since it handles API keys:

- **AES-256 Encryption**: All API keys are encrypted before storage with a vault secret that only you control
- **Redis TTL**: Encrypted keys are stored in Upstash Redis with a 30-day TTL — they auto-expire
- **Read-Only API**: I strongly recommend using read-only Binance API keys — ClawLens never needs to place trades
- **Server-Side Only**: API keys are decrypted only on the server (Next.js API routes). They never reach the client unencrypted
- **No Telemetry**: No tracking, no analytics collection, no data sent to third parties (Vercel Analytics is optional)
- **Row-Level Security**: Supabase tables use RLS to isolate user data
- **Open Source**: The full codebase is available for you to audit

---

## Project Structure

```
clawlens/
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── api/                 # API routes (server-side)
│   │   │   ├── assistant/       # Personal Assistant chat API
│   │   │   ├── binance/         # Binance proxy API (spot, web3, futures)
│   │   │   ├── council/         # Council debate orchestration API
│   │   │   ├── keys/            # Encrypted key management API
│   │   │   ├── llm/             # LLM proxy API (supports 9 providers)
│   │   │   └── telegram/        # Telegram bot webhook handler
│   │   ├── assistant/           # Personal Assistant chat UI
│   │   ├── council/             # Council debate interface
│   │   ├── dashboard/           # Dashboard with portfolio widgets
│   │   ├── analytics/           # Trading analytics page
│   │   ├── portfolio/           # Portfolio analysis page
│   │   ├── web3/                # Token search, audits, on-chain tools
│   │   ├── history/             # Past council session history
│   │   ├── settings/            # API keys, agents, Telegram config
│   │   ├── globals.css          # Design system (CSS variables, glassmorphism)
│   │   └── page.tsx             # Landing page
│   ├── agents/                  # AI agent system prompts (11 agents)
│   ├── components/              # React components
│   │   ├── council/             # Council UI (AgentCard, ConsensusGauge, VerdictCard)
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── layout/              # Sidebar, TopBar, MobileNav, PageTransition
│   │   ├── portfolio/           # Portfolio components
│   │   ├── settings/            # Settings panels
│   │   └── ui/                  # Reusable UI (Button, Card, Toast, CommandPalette)
│   ├── hooks/                   # Custom React hooks (useReducedMotion, etc.)
│   ├── lib/                     # Core utilities
│   │   ├── arbiter.ts           # Multi-agent orchestration engine
│   │   ├── binanceClient.ts     # Binance API client
│   │   ├── keyVault.ts          # AES-256 key encryption/decryption
│   │   ├── llmClient.ts         # Multi-provider LLM client
│   │   ├── personalAssistant/   # Chat manager, skill router, skill catalog
│   │   ├── telegram/            # Telegram bot client, message handler
│   │   └── ...
│   ├── skills/                  # Skill definitions (56+ skills)
│   │   ├── bsc/                 # BSC on-chain skills (10)
│   │   ├── futures/             # Futures analytics skills (14)
│   │   └── *.ts                 # Spot, web3, and custom skills
│   ├── store/                   # Zustand state management
│   └── types/                   # TypeScript type definitions
├── public/                      # Static assets
├── supabase-schema.sql          # Database schema (run in Supabase SQL Editor)
├── DEPLOY.md                    # Detailed deployment guide
├── CONTRIBUTING.md              # Contribution guidelines
└── ...
```

### Skills System

ClawLens uses a modular "Skills" system. Each skill is an independent data fetcher that returns structured data. The Personal Assistant and Council agents both use these skills to provide real, live data — not hallucinated responses.

| Skill Type      | Count  | Examples                                         |
| --------------- | ------ | ------------------------------------------------ |
| Binance Spot    | 8      | Portfolio Pulse, Trade History, Market Data       |
| Binance Web3    | 6      | Token Audit, Address Info, Smart Money Signals   |
| Binance Futures | 14     | Funding Heatmap, OI Surge, Taker Pressure        |
| BSC On-Chain    | 10     | Wallet Tracker, Transaction Analyzer, Burn Track |
| Custom          | 12     | Fear Index, Whale Radar, Trade Journal, DCA      |
| Council-Only    | 6      | Council Analyzer, Consensus Detector, Verdict    |
| **Total**       | **56** | All accessible by Personal Assistant & Council   |

---

## Troubleshooting

### Common Issues

**"Binance API Error: Invalid API Key"**
- Make sure your API key has **read-only** permissions enabled
- Check that your API key is not IP-restricted (or add your server's IP)
- Verify you're using a Binance.com key (not Binance.US)

**"LLM Connection Failed"**
- Double-check your LLM API key is correct and has credits/quota
- If using Ollama, make sure it's running locally on `http://localhost:11434`
- Try a different provider to isolate the issue

**"Supabase Connection Error"**
- Verify your Supabase URL and keys in `.env.local`
- Make sure you ran the `supabase-schema.sql` in the SQL Editor
- Check that the Service Role Key is correct (not the Anon Key)

**Council gives generic responses**
- This usually means the LLM API key is invalid or rate-limited
- Try with a fresh API key or switch to a different provider
- Groq and Gemini have generous free tiers for testing

**Telegram bot not responding**
- Make sure `NEXT_PUBLIC_APP_URL` is set to your deployed URL (not localhost)
- Check that the bot token from @BotFather is correct
- The webhook is registered automatically when you link in Settings

### Need Help?

Open an issue on [GitHub](https://github.com/monsoonx9/clawlens/issues) with:
- What you were trying to do
- The error message (if any)
- Your Node.js version (`node -v`)

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

ClawLens is an educational and analytical tool, not a financial advisor. The information provided by the AI agents should not be considered financial advice. Cryptocurrency trading involves significant risk of loss and is not suitable for all investors. Always do your own research (DYOR) before making any financial decisions.

---

## Acknowledgments

- [OpenClaw](https://openclaw.org/) — Inspiration for the multi-agent architecture
- [Binance](https://www.binance.com/) — Market data and Web3 APIs
- [Supabase](https://supabase.com/) — PostgreSQL database and auth
- [Viem](https://viem.sh/) — BSC blockchain interactions
- [Upstash](https://upstash.com/) — Redis caching and encrypted key storage
- The open-source community for the incredible tools that make this possible

---

<div align="center">

**Built with 🔱 by [@MonsoonX9](https://twitter.com/MonsoonX9)**

Star on [GitHub](https://github.com/monsoonx9/clawlens) · Follow on [X](https://twitter.com/MonsoonX9)

</div>

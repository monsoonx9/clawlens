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

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**ClawLens** is an intelligent, multi-agent crypto analysis platform that connects to your Binance account and deploys a "Council" of 11 specialized AI agents to analyze your portfolio and the market — plus a Personal AI Assistant and a Telegram bot for on-the-go access.

[View Demo](https://clawlens-beta.vercel.app) · [Report Bug](https://github.com/monsoonx9/clawlens/issues) · [Request Feature](https://github.com/monsoonx9/clawlens/issues)

</div>

---

## Why ClawLens?

Traditional crypto analysis tools rely on a single AI model, which can miss important context or provide biased insights. ClawLens solves this by using a **multi-agent system** where 10 specialized AI agents analyze your queries from different perspectives, with "The Arbiter" synthesizing their findings into a comprehensive verdict.

### The Problem

- Single AI models often miss critical signals
- No context-aware portfolio analysis
- Limited market intelligence
- No unified view of risks and opportunities

### The Solution

ClawLens brings together:

- **11 specialized agents** (10 council members + The Arbiter) with distinct expertise
- **56+ integrated skills** for real-time data fetching
- **Real-time Binance data** integration (spot, futures, and on-chain)
- **Personal AI Assistant** with full access to all 56+ skills
- **Telegram Bot** for real-time AI conversations on the go
- **Consensus detection** to identify agreement across agents
- **Risk assessment** from multiple angles

---

## Features

### 🏛️ The Council (11 Agents)

| Agent           | Role                   | Focus Area                                          |
| --------------- | ---------------------- | --------------------------------------------------- |
| **SCOUT**       | Market Discovery       | Trending tokens, gainers/losers, market overview    |
| **THE WARDEN**  | Risk & Security        | Token audits, contract security, rug pull detection |
| **LENS**        | Token Intelligence     | Technical analysis, tokenomics, order book depth    |
| **SHADOW**      | Smart Money            | Whale tracking, on-chain signals, wallet analysis   |
| **LEDGER**      | Portfolio Manager      | Portfolio health, P&L, DCA planning                 |
| **PULSE**       | Sentiment & Narrative  | Fear index, market sentiment, volume analysis       |
| **SAGE**        | Education & Guidance   | Explain concepts using your portfolio               |
| **QUILL**       | Trade Historian        | Trade history analysis, behavioral patterns         |
| **FUTURES**     | Derivatives & Leverage | Funding rates, open interest, perpetual markets     |
| **BLAZE**       | BSC & BNB Chain        | On-chain DeFi, token burns, BSC wallet tracking     |
| **THE ARBITER** | Council Head           | Synthesizes all reports into final verdict          |

### 🤖 Personal AI Assistant (Claw)

A full-featured AI assistant that can access **all 56+ skills** directly:

- Natural language conversations about your portfolio, market data, and on-chain analytics
- Dynamic skill routing — automatically detects which tools to invoke based on your message
- Conversation history stored in Supabase
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

- **Trending Tokens** - Real-time trending, social hype, alpha rankings
- **Meme Rush** - New token launches from launchpads
- **Exchange Stats** - Top gainers, losers, most volatile
- **Technical Indicators** - SMA, EMA, MACD, RSI, Bollinger Bands
- **Order Book Analysis** - Liquidity zones, spoofing detection
- **Volume Analysis** - Volume spikes, buy/sell pressure
- **Futures Data** - Funding rates, open interest, position ratios

### 💼 Portfolio Tools

- **Portfolio Pulse** - Real-time holdings, P&L, FIFO cost basis
- **Trade Journal** - Win rate, profit factor, behavioral patterns
- **DCA Strategist** - Dollar-cost averaging plans
- **Price Alerts** - Create and manage price alerts

### 🛡️ Risk & Security

- **Token Audit** - Contract security analysis
- **Rug Shield** - Comprehensive risk scoring
- **Fear Index** - Multi-factor sentiment scoring
- **Address Lookup** - Query any wallet for holdings

### 🐋 Smart Money Tracking

- **Whale Radar** - Large wallet tracking, consensus detection
- **Trading Signals** - On-chain smart money signals
- **Whale Footprint** - Large trade tracking
- **Smart Accumulation** - Institutional accumulation detection
- **Smart Money Radar** - Smart money flow direction

### 🔗 BSC On-Chain Analytics

- **BSC Wallet Tracker** - Track any BSC wallet holdings and activity
- **BSC Transaction Analyzer** - Decode and analyze BSC transactions
- **BSC Block Explorer** - Browse blocks, transactions, and events
- **BSC Token On-Chain** - On-chain token data (holders, transfers, supply)
- **BSC NFT Portfolio** - NFT holdings and collection analysis
- **BSC Contract Reader** - Read and analyze smart contract data
- **BSC Whale Movement** - Large BNB/BEP-20 transfers tracking
- **Sniper Detector** - Bot/sniper detection on new token launches
- **Wallet Cluster** - Related wallet identification and clustering
- **Burn Tracker** - Token burn event monitoring

### 🔮 Advanced Futures Analytics

- **Funding Heatmap** - Cross-market funding rate visualization
- **Funding Extremes** - Extreme funding rate detection
- **Funding History** - Historical funding rate trends
- **Taker Pressure** - Buy vs sell taker volume analysis
- **OI Surge** - Open interest spike detection
- **Basis Spread** - Spot-futures premium/discount analysis
- **Volatility Rank** - Cross-pair volatility comparison
- **Market Regime** - Bull/bear/sideways regime detection
- **Candlestick Patterns** - Pattern recognition (doji, hammer, engulfing, etc.)
- **Correlation Matrix** - Cross-asset correlation analysis
- **DCA Backtester** - Historical DCA performance simulation
- **Market Impact** - Slippage and market impact estimation

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

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL — chat history, Telegram connections)
- **Blockchain**: [Viem](https://viem.sh/) (BSC RPC)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Caching**: [Upstash Redis](https://upstash.com/)

### Skills System

ClawLens uses a modular "Skills" system where each skill is an independent data fetcher. The Personal Assistant dynamically routes to any skill using TF-IDF token matching:

| Skill Type      | Count  | Examples                                         |
| --------------- | ------ | ------------------------------------------------ |
| Binance Spot    | 8      | Portfolio Pulse, Trade History, Market Data      |
| Binance Web3    | 6      | Token Audit, Address Info, Smart Money Signals   |
| Binance Futures | 14     | Funding Heatmap, OI Surge, Taker Pressure        |
| BSC On-Chain    | 10     | Wallet Tracker, Transaction Analyzer, Burn Track |
| Custom          | 12     | Fear Index, Whale Radar, Trade Journal, DCA      |
| Council-Only    | 6      | Council Analyzer, Consensus Detector, Verdict    |
| **Total**       | **56** | All accessible by Personal Assistant & Council   |

---

## Supported LLM Providers

ClawLens supports 9 LLM providers for the AI agents and Personal Assistant:

| Provider     | Default Model                 |
| ------------ | ----------------------------- |
| OpenAI       | gpt-5.4                       |
| Anthropic    | claude-sonnet-4-6             |
| Groq         | llama-3.3-70b-versatile       |
| Gemini       | gemini-3.1-flash-lite-preview |
| Azure OpenAI | gpt-5.4                       |
| Ollama       | deepseek-r1                   |
| OpenRouter   | openai/gpt-5.4                |
| MiniMax      | MiniMax-M2.5                  |
| Ollama Cloud | qwen3-coder:480b-cloud        |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Binance Account with API Key (Read-Only recommended)
- LLM API Key (OpenAI, Anthropic, Groq, Gemini, etc.)
- [Upstash Redis](https://upstash.com/) account (for key storage and caching)
- [Supabase](https://supabase.com/) project (for chat history and Telegram connections)

### Installation

```bash
# Clone the repository
git clone https://github.com/monsoonx9/clawlens
cd clawlens

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. Complete the onboarding flow at `/onboarding`
2. Enter your Binance API key and secret
3. Select your preferred LLM provider and add your API key
4. (Optional) Connect your Telegram bot in Settings
5. Start analyzing!

---

## Deployment

### Vercel (Recommended)

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

```bash
# Quick deploy with Vercel CLI
npm i -g vercel
vercel
```

### Environment Variables

| Variable                        | Required | Description                                           |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`        | Yes      | Upstash Redis REST URL                                |
| `UPSTASH_REDIS_REST_TOKEN`      | Yes      | Upstash Redis REST Token                              |
| `VAULT_SECRET`                  | Yes      | Secret key for encrypting API keys (min 32 chars)     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase Project URL                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase Publishable (Anon) Key                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase Legacy Service Role Key (for backend ops)    |
| `NEXT_PUBLIC_APP_URL`           | No       | Production URL (e.g., `https://clawlens-beta.vercel.app`) |
| `TELEGRAM_BOT_TOKEN`            | No       | Telegram Bot Token from @BotFather                    |
| `TELEGRAM_WEBHOOK_SECRET`       | No       | Secret for Telegram webhook verification              |

---

## Security

- **No Server Storage of Keys**: API keys are encrypted with AES-256 and stored in Redis with a 30-day TTL
- **Read-Only API**: We strongly recommend using read-only Binance API keys
- **No Telemetry**: No tracking or analytics
- **Client-Side Encryption**: Keys never leave your device unencrypted
- **Open Source**: Full codebase available for verification

---

## Project Structure

```
clawlens/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   │   ├── assistant/   # Personal Assistant API
│   │   │   ├── binance/     # Binance proxy API
│   │   │   ├── council/     # Council debate API
│   │   │   ├── llm/         # LLM proxy API
│   │   │   └── telegram/    # Telegram bot API
│   │   ├── assistant/       # Personal Assistant UI
│   │   ├── council/         # Council debate interface
│   │   ├── dashboard/       # Dashboard with widgets
│   │   ├── portfolio/       # Portfolio analysis
│   │   ├── web3/            # Token search, audits
│   │   └── ...
│   ├── agents/              # AI agent prompts (11 agents)
│   ├── components/          # React components
│   │   ├── council/         # Council UI
│   │   ├── dashboard/       # Widgets
│   │   ├── portfolio/       # Portfolio components
│   │   ├── settings/        # Settings panels
│   │   └── ui/              # Reusable UI
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core utilities
│   │   ├── arbiter.ts       # Multi-agent orchestration
│   │   ├── binanceClient.ts # Binance API
│   │   ├── keyVault.ts      # Key encryption
│   │   ├── personalAssistant/ # Chat manager, skill router
│   │   ├── telegram/        # Telegram bot client, commands
│   │   └── ...
│   ├── skills/              # Skill definitions (56+ skills)
│   │   ├── bsc/             # BSC on-chain skills (10)
│   │   └── futures/         # Futures analytics skills (14)
│   ├── store/               # Zustand store
│   └── types/               # TypeScript types
├── public/
│   └── skills/              # Public skill docs
└── ...
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

ClawLens is an educational and analytical tool, not a financial advisor. The information provided by the AI agents should not be considered financial advice. Always do your own research (DYOR) before making any financial decisions.

---

## Acknowledgments

- [OpenClaw](https://openclaw.org/) - Inspiration for the multi-agent architecture
- [Binance](https://www.binance.com/) - For the API and market data
- [Supabase](https://supabase.com/) - For PostgreSQL database
- [Viem](https://viem.sh/) - For Ethereum interactions
- [Upstash](https://upstash.com/) - For Redis caching
- All contributors and testers

---

<div align="center">

**Built with 🔱 by [@MonsoonX9](https://twitter.com/MonsoonX9)**

Star us on [GitHub](https://github.com/monsoonx9/clawlens) · Follow on [X](https://twitter.com/MonsoonX9)

</div>

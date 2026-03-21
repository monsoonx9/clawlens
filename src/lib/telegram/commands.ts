import {
  getMainKeyboard,
  getSettingsKeyboard,
  getAlertsKeyboard,
  getHelpKeyboard,
} from "./keyboards";
import { telegramSkillService } from "./telegramSkillService";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

interface CommandContext {
  chatId: number;
  userId?: string;
  username?: string;
  firstName?: string;
}

const supabase = getSupabaseAdmin();

export async function handleStartCommand(context: CommandContext): Promise<string> {
  return `Welcome to ClawLens Bot, ${context.firstName || "there"}! 👋

Your personal AI trading assistant with access to 50+ skills!

I can help you with:
📊 Portfolio analysis
💰 Token prices & charts
🐋 Whale tracking
🔔 Price alerts
📈 Technical analysis
🛡️ Rug checks
💬 Natural language queries

To access your personal account:
1. Go to ClawLens Dashboard → Settings → Telegram Bot
2. Click "Generate Link Code"
3. Send /link CODE to this bot

Or just ask me anything!`;
}

export async function handleHelpCommand(
  _context: CommandContext,
): Promise<{ text: string; keyboard?: unknown }> {
  return {
    text: `🛠 *Available Commands*

*📊 Portfolio*
/portfolio - Your portfolio summary

*💰 Prices*
/price BTC - Get token price

*🐋 Whale Tracking*
/whale - Recent whale activity
/subscribe whale - Enable whale alerts

*🔔 Alerts*
/alerts - Manage price alerts
/subscribe news - Enable news alerts

*⚙️ Settings*
/settings - Bot preferences
/digest set 9:00 - Daily summary time

*💬 Quick Ask*
Just send any message and I'll analyze it!

*Examples:*
"What's my portfolio value?"
"Check BTC price"
"Is this token safe? [address]"
"Analyze my holdings"`,
    keyboard: getHelpKeyboard(),
  };
}

export async function handlePortfolioCommand(context: CommandContext): Promise<string> {
  if (!context.userId) {
    return "❌ Please link your account first. Send /link CODE to connect.";
  }

  const result = await telegramSkillService.execute(
    "claw-council/portfolio-pulse",
    {},
    { userId: context.userId },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "❌ Failed to fetch portfolio. Please try again.";
  }

  return result.formattedMessage;
}

export async function handleAlertsCommand(
  context: CommandContext,
): Promise<{ text: string; keyboard?: unknown } | string> {
  if (!context.userId) {
    return "❌ Please link your account first. Send /link CODE to connect.";
  }

  const { data: alerts } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", context.userId)
    .eq("triggered", false)
    .limit(10);

  let message = "🔔 *Price Alerts*\n\n";

  if (!alerts || alerts.length === 0) {
    message += 'No active alerts.\n\nCreate one: "Alert me when BTC hits $100k"';
  } else {
    message += `*Active Alerts (${alerts.length}):*\n\n`;
    for (const alert of alerts.slice(0, 5)) {
      const emoji = alert.condition === "above" ? "📈" : "📉";
      message += `${emoji} ${alert.symbol} ${alert.condition} $${alert.target_price}\n`;
    }
  }

  return { text: message, keyboard: getAlertsKeyboard() };
}

export async function handleSettingsCommand(
  context: CommandContext,
): Promise<{ text: string; keyboard?: unknown } | string> {
  if (!context.userId) {
    return "❌ Please link your account first. Send /link CODE to connect.";
  }

  const { data: settings } = await supabase
    .from("telegram_connections")
    .select("notification_settings")
    .eq("user_id", context.userId)
    .single();

  const ns = settings?.notification_settings || {};

  const priceEmoji = ns.priceAlerts !== false ? "✅" : "❌";
  const whaleEmoji = ns.whaleAlerts !== false ? "✅" : "❌";
  const digestEmoji = ns.portfolioDigest !== false ? "✅" : "❌";
  const newsEmoji = ns.newsAlerts !== false ? "✅" : "❌";

  const digestTime = ns.digestTime || "09:00";

  return {
    text: `⚙️ *Notification Settings*

${priceEmoji} Price Alerts
${whaleEmoji} Whale Alerts
${newsEmoji} News Alerts
${digestEmoji} Daily Digest (${digestTime})

Use /subscribe [whale|news] to toggle
Use /digest set HH:MM to change time

Manage all settings in the ClawLens web app.`,
    keyboard: getSettingsKeyboard(),
  };
}

export async function handleSubscribeCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  if (!context.userId) {
    return "❌ Please link your account first. Send /link CODE to connect.";
  }

  const type = args.toLowerCase().trim();

  if (!type || !["whale", "news", "portfolio"].includes(type)) {
    return `*Subscribe to Alerts*

Usage: /subscribe [type]

Types:
• whale - Get whale movement alerts
• news - Get crypto news alerts
• portfolio - Get daily summaries

Example: /subscribe whale`;
  }

  const { notificationService } = await import("./notificationService");

  switch (type) {
    case "whale":
      await notificationService.updateUserNotificationSettings(context.userId, {
        whaleAlerts: true,
      });
      return "✅ *Whale Alerts Enabled*\n\nYou'll receive notifications when tracked whale wallets make significant moves.";

    case "news":
      await notificationService.updateUserNotificationSettings(context.userId, {
        newsAlerts: true,
      });
      return "✅ *News Alerts Enabled*\n\nYou'll receive notifications for important crypto news.";

    case "portfolio":
      await notificationService.updateUserNotificationSettings(context.userId, {
        portfolioDigest: true,
      });
      return "✅ *Portfolio Digest Enabled*\n\nUse /digest set HH:MM to set your preferred time.";

    default:
      return "Unknown subscription type.";
  }
}

export async function handleDigestCommand(context: CommandContext, args: string): Promise<string> {
  if (!context.userId) {
    return "❌ Please link your account first. Send /link CODE to connect.";
  }

  const parts = args.toLowerCase().trim().split(/\s+/);

  if (parts[0] === "off" || parts[0] === "disable") {
    await (
      await import("./notificationService")
    ).notificationService.updateUserNotificationSettings(context.userId, {
      portfolioDigest: false,
    });
    return "❌ *Portfolio Digest Disabled*";
  }

  if (parts[0] === "set" && parts[1]) {
    const time = parts[1];
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      return "❌ Invalid format. Use: /digest set 09:00";
    }

    await (
      await import("./notificationService")
    ).notificationService.updateUserNotificationSettings(context.userId, {
      portfolioDigest: true,
      digestTime: time,
    });
    return `✅ *Digest Time Set*\n\nYou'll receive your portfolio summary daily at ${time}.`;
  }

  return `*Daily Portfolio Digest*

Usage:
• /digest set 09:00 - Set daily time
• /digest off - Disable

Get a daily summary of your portfolio P&L and top movers.`;
}

export async function handleWhaleCommand(context: CommandContext): Promise<string> {
  const result = await telegramSkillService.execute(
    "claw-council/whale-radar",
    { limit: 10 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "❌ Failed to fetch whale data.";
  }

  return result.formattedMessage;
}

export async function handleRugCheckCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const address = args.trim();

  if (!address) {
    return "Please provide a contract address.\n\nExample: /rug 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "claw-council/rug-shield",
    { contractAddress: address },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "❌ Failed to check contract.";
  }

  return result.formattedMessage;
}

// ==================== NEW COMMAND HANDLERS ====================

export async function handlePriceCommand(context: CommandContext, args: string): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /price BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/spot",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch price.";
  }
  return result.formattedMessage;
}

export async function handleFearIndexCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const token = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "claw-council/fear-index",
    {
      token,
      socialHypeScore: 50,
      memeRushMomentum: 50,
      smartMoneyDirection: 50,
      priceChange24h: 0,
    },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to calculate fear index.";
  }
  return result.formattedMessage;
}

export async function handleVolumeCommand(context: CommandContext, args: string): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /volume BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/volume-analysis",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to analyze volume.";
  }
  return result.formattedMessage;
}

export async function handleOrderBookCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /orderbook BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/order-book-analysis",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to analyze order book.";
  }
  return result.formattedMessage;
}

export async function handleTechnicalAnalysisCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /ta BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/technical-indicators",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to calculate technical indicators.";
  }
  return result.formattedMessage;
}

export async function handleDCAStrategistCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const parts = args.trim().split(/\s+/);
  const symbol = parts[0]?.toUpperCase() || "BTC";
  const budget = Number(parts[1]) || 500;
  const weeks = Number(parts[2]) || 12;
  const risk = Number(parts[3]) || 5;

  const result = await telegramSkillService.execute(
    "claw-council/dca-strategist",
    {
      targetAsset: symbol,
      totalBudgetUSD: budget,
      durationWeeks: weeks,
      riskTolerance: risk,
    },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to generate DCA plan.";
  }
  return result.formattedMessage;
}

export async function handleFuturesCommand(context: CommandContext, args: string): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /futures BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/futures-data",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch futures data.";
  }
  return result.formattedMessage;
}

export async function handleTrendingCommand(context: CommandContext): Promise<string> {
  const result = await telegramSkillService.execute(
    "binance/crypto-market-rank",
    { limit: 10 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch trending.";
  }
  return result.formattedMessage;
}

export async function handleNewsCommand(context: CommandContext): Promise<string> {
  const result = await telegramSkillService.execute(
    "claw-council/news-radar",
    { limit: 5 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch news.";
  }
  return result.formattedMessage;
}

// ==================== BSC COMMANDS ====================

export async function handleBSCWhaleCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a BSC address.\n\nExample: /bsc-whale 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/bsc-whale-movement",
    { address, threshold: 100, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to check BSC whale.";
  }
  return result.formattedMessage;
}

export async function handleBSCWalletCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a BSC address.\n\nExample: /bsc-wallet 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/bsc-wallet-tracker",
    { address, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch wallet.";
  }
  return result.formattedMessage;
}

export async function handleBSCTokenCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a token address.\n\nExample: /bsc-token 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/bsc-token-on-chain",
    { tokenAddress: address, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch token info.";
  }
  return result.formattedMessage;
}

export async function handleBSCTxCommand(context: CommandContext, args: string): Promise<string> {
  const hash = args.trim();
  if (!hash) {
    return "Please provide a transaction hash.\n\nExample: /bsc-tx 0xabcd...1234";
  }

  const result = await telegramSkillService.execute(
    "bsc/bsc-transaction-analyzer",
    { txHash: hash, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to analyze transaction.";
  }
  return result.formattedMessage;
}

export async function handleBSCContractCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const parts = args.trim().split(/\s+/);
  const address = parts[0];
  const method = parts[1] || "symbol";

  if (!address) {
    return "Please provide a contract address and method.\n\nExample: /bsc-read 0x1234... symbol";
  }

  const result = await telegramSkillService.execute(
    "bsc/bsc-contract-reader",
    { contractAddress: address, method, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to read contract.";
  }
  return result.formattedMessage;
}

export async function handleBSCBlockCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const blockNumber = parseInt(args.trim()) || undefined;

  const result = await telegramSkillService.execute(
    "bsc/bsc-block-explorer",
    { blockNumber, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to explore block.";
  }
  return result.formattedMessage;
}

export async function handleSniperCommand(context: CommandContext, args: string): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a token address.\n\nExample: /sniper 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/sniper-detector",
    { tokenAddress: address, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to detect snipers.";
  }
  return result.formattedMessage;
}

export async function handleBurnCommand(context: CommandContext, args: string): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a token address.\n\nExample: /burn 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/burn-tracker",
    { token_address: address, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to track burns.";
  }
  return result.formattedMessage;
}

export async function handleClusterCommand(context: CommandContext, args: string): Promise<string> {
  const address = args.trim();
  if (!address) {
    return "Please provide a wallet address.\n\nExample: /cluster 0x1234...abcd";
  }

  const result = await telegramSkillService.execute(
    "bsc/wallet-cluster",
    { address, network: "bsc" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to analyze wallet cluster.";
  }
  return result.formattedMessage;
}

// ==================== FUTURES COMMANDS ====================

export async function handleSmartMoneyCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "binance/smart-money-radar",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch smart money.";
  }
  return result.formattedMessage;
}

export async function handleSmartAccumulationCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "binance/smart-accumulation",
    { symbols: [symbol] },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch accumulation data.";
  }
  return result.formattedMessage;
}

export async function handleTakerPressureCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "binance/taker-pressure",
    { symbol: symbol + "USDT" },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch taker pressure.";
  }
  return result.formattedMessage;
}

export async function handleVolatilityCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "binance/volatility-rank",
    { symbol: symbol + "USDT", limit: 20 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch volatility.";
  }
  return result.formattedMessage;
}

export async function handleFundingHeatmapCommand(context: CommandContext): Promise<string> {
  const result = await telegramSkillService.execute(
    "binance/funding-heatmap",
    { limit: 20 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch funding heatmap.";
  }
  return result.formattedMessage;
}

export async function handleFuturesWhaleCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase() || "BTC";

  const result = await telegramSkillService.execute(
    "binance/whale-footprint",
    { symbol: symbol + "USDT", limit: 10 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to fetch whale footprint.";
  }
  return result.formattedMessage;
}

export async function handleDCABacktestCommand(
  context: CommandContext,
  args: string,
): Promise<string> {
  const symbol = args.trim().toUpperCase();
  if (!symbol) {
    return "Please provide a symbol.\n\nExample: /dcaback BTC";
  }

  const result = await telegramSkillService.execute(
    "binance/dca-backtester",
    { symbol: symbol + "USDT", amount_per_interval: 100, interval_days: 7, total_days: 365 },
    { userId: context.userId || "" },
  );

  if (!result.success || !result.formattedMessage) {
    return result.error || "Failed to backtest DCA.";
  }
  return result.formattedMessage;
}

export function parseCommand(text: string): { command: string; args: string } | null {
  const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return null;

  return {
    command: match[1].toLowerCase(),
    args: match[2] || "",
  };
}

import { getSkill } from "@/skills";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

interface TelegramSkillContext {
  userId: string;
  sessionId?: string;
}

export interface SkillResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  summary?: string;
  formattedMessage?: string;
}

export class TelegramSkillService {
  private supabase = getSupabaseAdmin();

  async execute(
    skillId: string,
    params: Record<string, unknown>,
    context: TelegramSkillContext,
  ): Promise<SkillResult> {
    try {
      const skill = getSkill(skillId);
      if (!skill) {
        return { success: false, error: `Skill not found: ${skillId}` };
      }

      const apiKeys = await this.getUserApiKeys(context.userId);
      const skillContext = {
        sessionId: context.sessionId,
        userId: context.userId,
        apiKeys,
      };

      const result = await skill.execute(params, skillContext);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Skill execution failed",
        };
      }

      return {
        success: true,
        data: result.data,
        summary: result.summary,
        formattedMessage: this.formatSkillResponse(skillId, result.data, result.summary),
      };
    } catch (error) {
      console.error(`[TelegramSkillService] Error executing ${skillId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async getUserApiKeys(userId: string): Promise<{
    binanceApiKey: string;
    binanceSecretKey: string;
    llmApiKey?: string;
    llmProvider?: string;
    llmModel?: string;
    llmBaseUrl?: string;
    llmEndpoint?: string;
    llmDeploymentName?: string;
    squareApiKey?: string;
  }> {
    try {
      const { data } = await this.supabase
        .from("encrypted_keys")
        .select("encrypted_data")
        .eq("user_id", userId)
        .single();

      if (!data) {
        return { binanceApiKey: "", binanceSecretKey: "" };
      }

      const { decryptKeys } = await import("@/lib/keyVault");
      const keys = await decryptKeys(data.encrypted_data);
      return {
        binanceApiKey: keys.binanceApiKey || "",
        binanceSecretKey: keys.binanceSecretKey || "",
        llmApiKey: keys.llmApiKey,
        llmProvider: keys.llmProvider,
        llmModel: keys.llmModel,
        llmBaseUrl: keys.llmBaseUrl,
        llmEndpoint: keys.llmEndpoint,
        llmDeploymentName: keys.llmDeploymentName,
        squareApiKey: keys.squareApiKey,
      };
    } catch {
      return { binanceApiKey: "", binanceSecretKey: "" };
    }
  }

  private formatSkillResponse(
    skillId: string,
    data?: Record<string, unknown>,
    summary?: string,
  ): string {
    if (summary) return summary;

    if (!data) return "No data available";

    switch (skillId) {
      case "claw-council/portfolio-pulse":
        return this.formatPortfolioPulse(data);
      case "binance/spot":
        return this.formatSpotPrice(data);
      case "binance/technical-indicators":
        return this.formatTechnicalAnalysis(data);
      case "claw-council/rug-shield":
        return this.formatRugCheck(data);
      case "claw-council/whale-radar":
        return this.formatWhaleActivity(data);
      case "binance/crypto-market-rank":
        return this.formatMarketRank(data);
      case "claw-council/news-radar":
        return this.formatNews(data);
      case "binance/futures-data":
        return this.formatFuturesData(data);
      case "claw-council/fear-index":
        return this.formatFearIndex(data);
      case "claw-council/dca-strategist":
        return this.formatDCA(data);
      case "binance/volume-analysis":
        return this.formatVolumeAnalysis(data);
      case "binance/order-book-analysis":
        return this.formatOrderBook(data);
      default:
        return this.formatGeneric(data);
    }
  }

  private formatPortfolioPulse(data: Record<string, unknown>): string {
    const totalValue = data.totalValue as number;
    const totalPnl = data.totalPnl as number;
    const totalPnlPercent = data.totalPnlPercent as number;
    const assets = data.assets as Array<{
      symbol: string;
      value: number;
      amount: number;
      pnl: number;
      pnlPercent: number;
    }>;

    let message = "📊 *Portfolio Overview*\n\n";
    message += `💰 *Total Value:* $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

    if (totalPnl !== undefined) {
      const emoji = totalPnl >= 0 ? "📈" : "📉";
      const sign = totalPnl >= 0 ? "+" : "";
      message += `${emoji} *P&L:* ${sign}$${totalPnl.toFixed(2)} (${sign}${totalPnlPercent?.toFixed(2) || 0}%)\n`;
    }

    if (assets && assets.length > 0) {
      message += "\n🏛 *Holdings:*\n";
      for (const asset of assets.slice(0, 5)) {
        const pnlEmoji = asset.pnlPercent >= 0 ? "🟢" : "🔴";
        const pnlSign = asset.pnlPercent >= 0 ? "+" : "";
        message += `${pnlEmoji} ${asset.symbol}: $${asset.value.toFixed(2)} (${pnlSign}${asset.pnlPercent.toFixed(2)}%)\n`;
      }
    }

    return message;
  }

  private formatSpotPrice(data: Record<string, unknown>): string {
    const symbol = data.symbol as string;
    const price = data.price as number;
    const change24h = data.change24h as number;
    const volume24h = data.volume24h as number;
    const high24h = data.high24h as number;
    const low24h = data.low24h as number;

    const emoji = change24h >= 0 ? "📈" : "📉";
    const sign = change24h >= 0 ? "+" : "";

    let message = `${emoji} *${symbol}*\n\n`;
    message += `💵 *Price:* $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\n`;
    message += `${emoji} *24h Change:* ${sign}${change24h.toFixed(2)}%\n`;
    message += `📊 *24h Volume:* $${(volume24h / 1000000).toFixed(2)}M\n`;
    message += `🔼 *High:* $${high24h.toLocaleString()}\n`;
    message += `🔽 *Low:* $${low24h.toLocaleString()}\n`;

    return message;
  }

  private formatTechnicalAnalysis(data: Record<string, unknown>): string {
    const symbol = data.symbol as string;
    const price = data.price as number;
    const rsi = data.rsi as { value: number; overbought: boolean; oversold: boolean };
    const signals = data.signals as Record<string, string>;

    let message = `📊 *Technical Analysis: ${symbol}*\n\n`;
    message += `💵 *Price:* $${price.toLocaleString()}\n\n`;

    message += `📈 *RSI:* ${rsi.value.toFixed(1)}`;
    if (rsi.overbought) message += " (Overbought 🔴)";
    else if (rsi.oversold) message += " (Oversold 🟢)";
    message += "\n\n";

    if (signals) {
      message += "*📊 Signals:*\n";
      for (const [indicator, signal] of Object.entries(signals)) {
        const emoji = signal === "bullish" ? "🟢" : signal === "bearish" ? "🔴" : "⚪️";
        message += `${emoji} ${indicator}: ${signal}\n`;
      }
    }

    return message;
  }

  private formatRugCheck(data: Record<string, unknown>): string {
    const riskLevel = data.riskLevel as string;
    const riskScore = data.riskScore as number;
    const buyTax = data.buyTax as string | null;
    const sellTax = data.sellTax as string | null;
    const isVerified = data.isVerified as boolean;

    let emoji = "🟢";
    if (riskLevel === "HIGH") emoji = "🔴";
    else if (riskLevel === "MEDIUM") emoji = "🟡";

    let message = `${emoji} *Rug Risk Check*\n\n`;
    message += `⚠️ *Risk Level:* ${riskLevel} (${riskScore}/100)\n`;
    message += `✅ *Verified:* ${isVerified ? "Yes" : "No"}\n`;

    if (buyTax) message += `📥 *Buy Tax:* ${buyTax}\n`;
    if (sellTax) message += `📤 *Sell Tax:* ${sellTax}\n`;

    return message;
  }

  private formatWhaleActivity(data: Record<string, unknown>): string {
    const transactions = data.transactions as Array<{
      wallet: string;
      symbol: string;
      type: string;
      amount_usd: number;
      time_ago: string;
    }>;

    if (!transactions || transactions.length === 0) {
      return "🐋 *Whale Activity*\n\nNo recent whale activity detected.";
    }

    let message = "🐋 *Whale Activity*\n\n";
    for (const tx of transactions.slice(0, 5)) {
      const emoji = tx.type === "buy" ? "🟢" : "🔴";
      const action = tx.type === "buy" ? "Buy" : "Sell";
      const amount =
        tx.amount_usd >= 1000000
          ? `$${(tx.amount_usd / 1000000).toFixed(1)}M`
          : `$${(tx.amount_usd / 1000).toFixed(0)}K`;
      message += `${emoji} *${action}* ${tx.symbol}: ${amount}\n`;
      message += `   ${tx.wallet.slice(0, 8)}... (${tx.time_ago})\n`;
    }

    return message;
  }

  private formatMarketRank(data: Record<string, unknown>): string {
    const trending = data.trending as Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: number;
    }>;

    if (!trending || trending.length === 0) {
      return "📊 *Market Rank*\n\nNo data available.";
    }

    let message = "📊 *Top Trending*\n\n";
    for (const token of trending.slice(0, 5)) {
      const emoji = token.change24h >= 0 ? "📈" : "📉";
      const sign = token.change24h >= 0 ? "+" : "";
      message += `${emoji} *${token.symbol}*\n`;
      message += `   $${token.price.toLocaleString()} (${sign}${token.change24h.toFixed(1)}%)\n`;
    }

    return message;
  }

  private formatNews(data: Record<string, unknown>): string {
    const articles = data.articles as Array<{
      title: string;
      source: string;
      sentiment: string;
      time: string;
    }>;

    if (!articles || articles.length === 0) {
      return "📰 *Crypto News*\n\nNo recent news.";
    }

    let message = "📰 *Crypto News*\n\n";
    for (const article of articles.slice(0, 5)) {
      const emoji =
        article.sentiment === "positive" ? "🟢" : article.sentiment === "negative" ? "🔴" : "⚪️";
      message += `${emoji} *${article.title.slice(0, 60)}...*\n`;
      message += `   ${article.source} • ${article.time}\n\n`;
    }

    return message;
  }

  private formatFuturesData(data: Record<string, unknown>): string {
    const symbol = data.symbol as string;
    const fundingRate = data.fundingRate as number;
    const openInterest = data.openInterest as number;
    const longShortRatio = data.longShortRatio as number;

    let message = `📈 *Futures Data: ${symbol}*\n\n`;
    message += `💰 *Funding Rate:* ${(fundingRate * 100).toFixed(4)}%\n`;
    message += `📊 *Open Interest:* $${(openInterest / 1000000).toFixed(2)}M\n`;

    if (longShortRatio !== undefined) {
      const emoji = longShortRatio > 1 ? "🟢" : longShortRatio < 1 ? "🔴" : "⚪️";
      message += `${emoji} *Long/Short:* ${longShortRatio.toFixed(2)}\n`;
    }

    return message;
  }

  private formatFearIndex(data: Record<string, unknown>): string {
    const token = data.token as string;
    const score = data.score as number;
    const label = data.label as string;

    let emoji = "⚪️";
    if (score <= 25) emoji = "🔴";
    else if (score <= 45) emoji = "🟡";
    else if (score <= 55) emoji = "⚪️";
    else emoji = "🟢";

    let message = `${emoji} *Fear & Greed Index: ${token}*\n\n`;
    message += `📊 *Score:* ${score}/100 (${label})\n`;

    return message;
  }

  private formatDCA(data: Record<string, unknown>): string {
    const targetAsset = (data.targetAsset as string) || "Unknown";
    const totalBudgetUSD = data.totalBudgetUSD as number;
    const currentPrice = data.currentPrice as number;
    const scenarios = data.scenarios as
      | {
          bull?: { returnPercent: number };
          bear?: { returnPercent: number };
          crab?: { returnPercent: number };
        }
      | undefined;

    if (!scenarios || !totalBudgetUSD || !currentPrice) {
      return `📊 *DCA Strategist: ${targetAsset}*\n\n❌ Unable to generate DCA scenarios. Please try again.`;
    }

    let message = `📊 *DCA Strategist: ${targetAsset}*\n\n`;
    message += `💰 *Budget:* $${totalBudgetUSD}\n`;
    message += `💵 *Current Price:* $${currentPrice.toLocaleString()}\n\n`;
    message += `*Scenarios:*\n`;
    message += `  🟢 Bull: ${scenarios.bull && scenarios.bull.returnPercent >= 0 ? "+" : ""}${scenarios.bull?.returnPercent?.toFixed(1) ?? "N/A"}%\n`;
    message += `  🔴 Bear: ${scenarios.bear && scenarios.bear.returnPercent >= 0 ? "+" : ""}${scenarios.bear?.returnPercent?.toFixed(1) ?? "N/A"}%\n`;
    message += `  ⚪️ Crab: ${scenarios.crab && scenarios.crab.returnPercent >= 0 ? "+" : ""}${scenarios.crab?.returnPercent?.toFixed(1) ?? "N/A"}%\n`;

    return message;
  }

  private formatVolumeAnalysis(data: Record<string, unknown>): string {
    const symbol = data.symbol as string;
    const volumeRatio = data.volumeRatio as number;
    const buySellRatio = data.buySellRatio as number;

    let emoji = "⚪️";
    if (buySellRatio > 1.2) emoji = "🟢";
    else if (buySellRatio < 0.8) emoji = "🔴";

    let message = `📊 *Volume Analysis: ${symbol}*\n\n`;
    message += `📈 *Volume Ratio:* ${volumeRatio.toFixed(2)}x\n`;
    message += `${emoji} *Buy/Sell:* ${buySellRatio.toFixed(2)}\n`;

    return message;
  }

  private formatOrderBook(data: Record<string, unknown>): string {
    const symbol = data.symbol as string;
    const spread = data.spread as number;
    const bidAskRatio = data.bidAskRatio as number;

    let message = `📊 *Order Book: ${symbol}*\n\n`;
    message += `💰 *Spread:* $${spread.toFixed(2)}\n`;
    message += `📈 *Bid/Ask:* ${bidAskRatio.toFixed(2)}\n`;

    return message;
  }

  private formatGeneric(data: Record<string, unknown>): string {
    const entries = Object.entries(data).slice(0, 10);
    let message = "📋 *Data*\n\n";

    for (const [key, value] of entries) {
      const formattedValue =
        typeof value === "number"
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : String(value);
      message += `• *${key}:* ${formattedValue}\n`;
    }

    return message;
  }
}

export const telegramSkillService = new TelegramSkillService();

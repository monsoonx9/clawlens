import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { notificationService } from "@/lib/telegram/notificationService";
import { getSkill } from "@/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = getSupabaseAdmin();

interface AlertRecord {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  condition: "above" | "below";
  triggered: boolean;
  notification_settings?: {
    priceAlerts?: boolean;
    whaleAlerts?: boolean;
    portfolioDigest?: boolean;
    newsAlerts?: boolean;
    digestTime?: string;
  };
}

interface WhaleSubscription {
  id: string;
  user_id: string;
  wallet_address: string;
  nickname: string;
  min_amount?: number;
  notification_settings?: {
    whaleAlerts?: boolean;
  };
}

async function checkPriceAlerts(): Promise<void> {
  const { data: alerts, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("triggered", false);

  if (error || !alerts || alerts.length === 0) return;

  const symbols = [...new Set(alerts.map((a: AlertRecord) => a.symbol))];
  const symbolPrices = await getTokenPrices(symbols);

  for (const alert of alerts as AlertRecord[]) {
    const currentPrice = symbolPrices[alert.symbol];
    if (!currentPrice) continue;

    const settings = await notificationService.getUserNotificationSettings(alert.user_id);
    if (!settings.priceAlerts) continue;

    let shouldTrigger = false;
    if (alert.condition === "above" && currentPrice >= alert.target_price) {
      shouldTrigger = true;
    } else if (alert.condition === "below" && currentPrice <= alert.target_price) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      const priceChange = (
        ((currentPrice - alert.target_price) / alert.target_price) *
        100
      ).toFixed(2);
      const direction = alert.condition === "above" ? "📈 rose" : "📉 dropped";

      await notificationService.send({
        userId: alert.user_id,
        type: "price_alert",
        title: `${alert.symbol} Price Alert!`,
        message:
          `${alert.symbol} has ${direction} to $${currentPrice.toFixed(4)}.\n\n` +
          `Your target: $${alert.target_price.toFixed(4)}\n` +
          `Change from target: ${priceChange}%\n\n` +
          `Alert ID: #${alert.id.slice(-6)}`,
        data: { alertId: alert.id, symbol: alert.symbol, price: currentPrice },
        priority: "high",
      });

      await supabase
        .from("price_alerts")
        .update({ triggered: true, triggered_at: new Date().toISOString() })
        .eq("id", alert.id);
    }
  }
}

async function checkWhaleAlerts(): Promise<void> {
  const { data: subscriptions, error } = await supabase.from("whale_wallets").select("*");

  if (error || !subscriptions || subscriptions.length === 0) return;

  const recentActivity = await getRecentWhaleActivity();

  for (const sub of subscriptions as WhaleSubscription[]) {
    const settings = await notificationService.getUserNotificationSettings(sub.user_id);
    if (!settings.whaleAlerts) continue;

    const activity = recentActivity.filter(
      (a) => a.wallet.toLowerCase() === sub.wallet_address.toLowerCase(),
    );

    for (const tx of activity) {
      if (sub.min_amount && tx.amount < sub.min_amount) continue;

      const isLarge = tx.amount_usd > 100000;
      const emoji = tx.type === "buy" ? "🟢" : "🔴";
      const action = tx.type === "buy" ? "accumulating" : "selling";

      await notificationService.send({
        userId: sub.user_id,
        type: "whale_alert",
        title: `${emoji} Whale Alert: ${sub.nickname || sub.wallet_address.slice(0, 8)}...`,
        message:
          `*${action.toUpperCase()}* ${tx.symbol}\n\n` +
          `Amount: ${formatAmount(tx.amount, tx.amount_usd)}\n` +
          `Price: $${tx.price.toFixed(4)}\n` +
          `Time: ${tx.time_ago}\n\n` +
          `TX: \`${tx.tx.slice(0, 12)}...\``,
        data: { wallet: sub.wallet_address, tx },
        priority: isLarge ? "urgent" : "normal",
      });
    }
  }
}

async function sendPortfolioDigest(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

  const { data: users, error } = await supabase
    .from("telegram_connections")
    .select("*, notification_settings")
    .eq("is_active", true);

  if (error || !users) return;

  for (const user of users) {
    const settings = user.notification_settings || {};
    if (!settings.portfolioDigest) continue;
    if (settings.digestTime !== currentTime) continue;

    const lastDigest = user.last_digest_sent;
    if (lastDigest) {
      const lastSent = new Date(lastDigest);
      const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 23) continue;
    }

    try {
      const skill = getSkill("claw-council/portfolio-pulse");
      if (!skill) continue;

      const apiKeys = await getUserApiKeys(user.user_id);
      if (!apiKeys?.binanceApiKey) continue;

      const result = await skill.execute({}, { apiKeys });

      if (result.success && result.data) {
        const data = result.data as {
          totalValue?: number;
          totalPnl?: number;
          totalPnlPercent?: number;
          assets?: Array<{ symbol: string; value: number; pnl: number; pnlPercent: number }>;
        };

        let message = `📊 *Daily Portfolio Digest*\n\n`;
        message += `💰 *Total Value:* $${(data.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

        if (data.totalPnl !== undefined) {
          const pnlEmoji = data.totalPnl >= 0 ? "📈" : "📉";
          const pnlSign = data.totalPnl >= 0 ? "+" : "";
          message += `${pnlEmoji} *P&L:* ${pnlSign}$${data.totalPnl.toFixed(2)} (${pnlSign}${data.totalPnlPercent?.toFixed(2) || 0}%)\n`;
        }

        if (data.assets && data.assets.length > 0) {
          message += `\n🏆 *Top Performers:*\n`;
          const sorted = [...data.assets].sort((a, b) => b.pnlPercent - a.pnlPercent);
          for (const asset of sorted.slice(0, 3)) {
            const emoji = asset.pnlPercent >= 0 ? "🟢" : "🔴";
            message += `${emoji} ${asset.symbol}: ${asset.pnlPercent >= 0 ? "+" : ""}${asset.pnlPercent.toFixed(2)}%\n`;
          }
        }

        await notificationService.send({
          userId: user.user_id,
          type: "portfolio",
          title: "📊 Daily Portfolio Summary",
          message,
          priority: "normal",
        });

        await supabase
          .from("telegram_connections")
          .update({ last_digest_sent: now.toISOString() })
          .eq("user_id", user.user_id);
      }
    } catch (error) {
      console.error(`[Cron] Failed to send digest for user ${user.user_id}:`, error);
    }
  }
}

async function getTokenPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const symbolList = symbols.map((s) => s.replace(/USDT$/, "") + "USDT").join(",");
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolList)}`,
    );
    const data = await response.json();

    const prices: Record<string, number> = {};
    for (const item of data) {
      const symbol = item.symbol.replace(/USDT$/, "");
      prices[symbol] = parseFloat(item.price);
    }
    return prices;
  } catch {
    return {};
  }
}

async function getRecentWhaleActivity(): Promise<
  Array<{
    wallet: string;
    symbol: string;
    type: "buy" | "sell";
    amount: number;
    amount_usd: number;
    price: number;
    tx: string;
    time_ago: string;
  }>
> {
  try {
    const skill = getSkill("claw-council/whale-radar");
    if (!skill) return [];

    const result = await skill.execute(
      { limit: 20, minAmount: 50000 },
      { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
    );
    if (result.success && result.data) {
      const data = result.data as { transactions?: Array<unknown> };
      return (data.transactions || []).slice(0, 20) as Array<{
        wallet: string;
        symbol: string;
        type: "buy" | "sell";
        amount: number;
        amount_usd: number;
        price: number;
        tx: string;
        time_ago: string;
      }>;
    }
    return [];
  } catch {
    return [];
  }
}

async function getUserApiKeys(userId: string): Promise<{
  binanceApiKey: string;
  binanceSecretKey: string;
} | null> {
  try {
    const { data } = await supabase
      .from("encrypted_keys")
      .select("encrypted_data")
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    const { decryptKeys } = await import("@/lib/keyVault");
    const keys = await decryptKeys(data.encrypted_data);
    return {
      binanceApiKey: keys.binanceApiKey || "",
      binanceSecretKey: keys.binanceSecretKey || "",
    };
  } catch {
    return null;
  }
}

function formatAmount(amount: number, amountUsd: number): string {
  if (amountUsd >= 1000000) {
    return `$${(amountUsd / 1000000).toFixed(2)}M`;
  } else if (amountUsd >= 1000) {
    return `$${(amountUsd / 1000).toFixed(2)}K`;
  }
  return `${amount.toFixed(4)} ${amountUsd.toFixed(2)}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[Cron] CRON_SECRET not configured - rejecting request");
    return NextResponse.json({ error: "Cron authentication not configured" }, { status: 500 });
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log("[Cron] Starting notification check...");

    await Promise.all([checkPriceAlerts(), checkWhaleAlerts(), sendPortfolioDigest()]);

    console.log("[Cron] Notification check completed in", Date.now() - startTime, "ms");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Cron] Error during notification check:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

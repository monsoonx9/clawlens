import { PriceAlert, loadAlerts, saveAlerts } from "@/skills/priceAlerts";

export type NotificationType = "price_alert" | "system" | "whale" | "watchlist";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

const NOTIFICATIONS_KEY = "clawlens_notifications";
const MAX_NOTIFICATIONS = 100;

export function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Notification[];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: Notification[]): void {
  if (typeof window === "undefined") return;

  try {
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save notifications:", error);
  }
}

export function addNotification(
  notification: Omit<Notification, "id" | "timestamp" | "read">,
): Notification {
  const notifications = loadNotifications();
  const newNotif: Notification = {
    ...notification,
    id: generateNotificationId(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(newNotif);
  saveNotifications(notifications);
  return newNotif;
}

export function markNotificationRead(id: string): void {
  const notifications = loadNotifications();
  const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
}

export function markAllNotificationsRead(): void {
  const notifications = loadNotifications();
  const updated = notifications.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
}

export function deleteNotification(id: string): void {
  const notifications = loadNotifications();
  const updated = notifications.filter((n) => n.id !== id);
  saveNotifications(updated);
}

export function clearAllNotifications(): void {
  saveNotifications([]);
}

export function getUnreadCount(): number {
  return loadNotifications().filter((n) => !n.read).length;
}

export function getNotificationsByType(type: NotificationType): Notification[] {
  return loadNotifications().filter((n) => n.type === type);
}

export async function checkPriceAlertsAndCreateNotifications(): Promise<Notification[]> {
  const alertsStore = loadAlerts();
  const allAlerts = Array.from(alertsStore.values());

  if (allAlerts.length === 0) return [];

  const symbols = [...new Set(allAlerts.map((a) => a.symbol))];
  const priceMap: Record<string, number> = {};

  const { getTicker24hr } = await import("@/lib/binanceClient");

  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const symbolWithSuffix = sym.toUpperCase().endsWith("USDT")
          ? sym.toUpperCase()
          : `${sym.toUpperCase()}USDT`;
        const tickerRes = await getTicker24hr(symbolWithSuffix);
        if (tickerRes.success && tickerRes.data) {
          const tickerData = tickerRes.data;
          const price = Array.isArray(tickerData) ? tickerData[0]?.lastPrice : tickerData.lastPrice;
          if (price) priceMap[sym] = price;
        }
      } catch {
        // Skip failed fetches
      }
    }),
  );

  const triggeredNotifications: Notification[] = [];

  for (const alert of allAlerts) {
    const currentPrice = priceMap[alert.symbol];
    if (!currentPrice) continue;

    let isTriggered = false;
    if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
      isTriggered = true;
    } else if (alert.condition === "below" && currentPrice <= alert.targetPrice) {
      isTriggered = true;
    }

    if (isTriggered) {
      const direction = alert.condition === "above" ? "↑" : "↓";
      const notif = addNotification({
        type: "price_alert",
        title: `Price Alert: ${alert.symbol}`,
        message: `${alert.symbol} is now ${direction} $${alert.targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
        data: { alertId: alert.id, symbol: alert.symbol },
      });
      triggeredNotifications.push(notif);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`🚨 Price Alert: ${alert.symbol}`, {
          body: `${alert.symbol} reached $${alert.targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
          icon: "/logo_v1.webp",
        });
      }

      alertsStore.delete(alert.id);
    }
  }

  if (triggeredNotifications.length > 0) {
    saveAlerts(alertsStore);
  }

  return triggeredNotifications;
}

export function addSystemNotification(
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Notification {
  return addNotification({
    type: "system",
    title,
    message,
    data,
  });
}

interface WatchlistTokenAlert {
  symbol: string;
  alertPrice?: number;
  alertCondition?: "above" | "below";
}

const TRIGGERED_ALERTS_KEY = "clawlens_triggered_watchlist_alerts";

function getTriggeredWatchlistAlerts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(TRIGGERED_ALERTS_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

function saveTriggeredWatchlistAlerts(alerts: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify([...alerts]));
}

export async function checkWatchlistAlertsAndCreateNotifications(
  watchlist: WatchlistTokenAlert[],
): Promise<Notification[]> {
  const tokensWithAlerts = watchlist.filter((t) => t.alertPrice && t.alertCondition);

  if (tokensWithAlerts.length === 0) return [];

  const triggeredAlerts = getTriggeredWatchlistAlerts();
  const symbols = tokensWithAlerts.map((t) => `${t.symbol}USDT`);
  const priceMap: Record<string, number> = {};

  const { getTicker24hr } = await import("@/lib/binanceClient");

  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const tickerRes = await getTicker24hr(sym);
        if (tickerRes.success && tickerRes.data) {
          const tickerData = tickerRes.data;
          const price = Array.isArray(tickerData) ? tickerData[0]?.lastPrice : tickerData.lastPrice;
          if (price) priceMap[sym.replace("USDT", "")] = price;
        }
      } catch {
        // Skip failed fetches
      }
    }),
  );

  const triggeredNotifications: Notification[] = [];

  for (const token of tokensWithAlerts) {
    if (!token.alertPrice || !token.alertCondition) continue;

    const alertKey = `${token.symbol}-${token.alertCondition}-${token.alertPrice}`;
    if (triggeredAlerts.has(alertKey)) continue;

    const currentPrice = priceMap[token.symbol];
    if (!currentPrice) continue;

    let isTriggered = false;
    if (token.alertCondition === "above" && currentPrice >= token.alertPrice) {
      isTriggered = true;
    } else if (token.alertCondition === "below" && currentPrice <= token.alertPrice) {
      isTriggered = true;
    }

    if (isTriggered) {
      triggeredAlerts.add(alertKey);
      const direction = token.alertCondition === "above" ? "↑" : "↓";
      const notif = addNotification({
        type: "price_alert",
        title: `Price Alert: ${token.symbol}`,
        message: `${token.symbol} is now ${direction} $${token.alertPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
        data: { symbol: token.symbol },
      });
      triggeredNotifications.push(notif);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`🚨 Price Alert: ${token.symbol}`, {
          body: `${token.symbol} reached $${token.alertPrice.toLocaleString()}`,
          icon: "/logo_v1.webp",
        });
      }
    }
  }

  if (triggeredNotifications.length > 0) {
    saveTriggeredWatchlistAlerts(triggeredAlerts);
  }

  return triggeredNotifications;
}

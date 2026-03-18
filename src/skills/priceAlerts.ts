import { Skill, SkillResult } from "./types";
import { getTicker24hr, BinanceTicker24hr } from "@/lib/binanceClient";

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  currentPrice: number;
  percentToTrigger: number;
  createdAt: string;
}

interface PriceAlertsInput {
  action?: "list" | "check" | "create" | "delete";
  symbol?: string;
  targetPrice?: number;
  condition?: "above" | "below";
  alertId?: string;
}

interface PriceAlertsResult {
  alerts: PriceAlert[];
  triggeredAlerts: PriceAlert[];
  activeCount: number;
  summary: string;
}

const STORAGE_KEY = "clawlens_price_alerts";
const MAX_ALERTS = 50;

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function loadAlerts(): Map<string, PriceAlert> {
  if (typeof window === "undefined") return new Map();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    const alerts = new Map<string, PriceAlert>();

    for (const [id, alert] of Object.entries(parsed)) {
      alerts.set(id, alert as PriceAlert);
    }

    return alerts;
  } catch (error) {
    console.error("Failed to load price alerts from localStorage:", error);
    return new Map();
  }
}

export function saveAlerts(alerts: Map<string, PriceAlert>): void {
  if (typeof window === "undefined") return;

  try {
    const obj: Record<string, PriceAlert> = {};
    alerts.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error("Failed to save price alerts to localStorage:", error);
  }
}

export const priceAlerts: Skill = {
  id: "binance/price-alerts",
  name: "Price Alerts",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Manage price alerts for trading pairs. Create alerts to be notified when a token reaches a target price. Check which alerts are triggered based on current market prices. Alerts are persisted in localStorage.",
  inputSchema: {
    action: {
      type: "string",
      required: false,
      description: "Action: list, check, create, delete (default: list)",
    },
    symbol: {
      type: "string",
      required: false,
      description: "Trading pair symbol (e.g., BTCUSDT)",
    },
    targetPrice: {
      type: "number",
      required: false,
      description: "Target price for alert",
    },
    condition: {
      type: "string",
      required: false,
      description: "Condition: above or below target price",
    },
    alertId: {
      type: "string",
      required: false,
      description: "Alert ID to delete",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const action = String(input.action || "list") as PriceAlertsInput["action"];
      const symbol = String(input.symbol || "").toUpperCase();
      const targetPrice = Number(input.targetPrice);
      const condition = String(input.condition || "above") as "above" | "below";
      const alertId = String(input.alertId || "");

      const alertsStore = loadAlerts();

      switch (action) {
        case "create": {
          if (!symbol || !targetPrice) {
            return {
              success: false,
              data: {},
              summary: "Symbol and targetPrice are required for creating an alert",
              error: "Missing required parameters",
            };
          }

          if (alertsStore.size >= MAX_ALERTS) {
            return {
              success: false,
              data: {},
              summary: `Maximum of ${MAX_ALERTS} alerts allowed. Please delete some alerts first.`,
              error: "Alert limit exceeded",
            };
          }

          let currentPrice = 0;
          try {
            const tickerRes = await getTicker24hr(symbol);
            if (tickerRes.success && tickerRes.data) {
              const tickerData = tickerRes.data;
              currentPrice = Array.isArray(tickerData)
                ? tickerData[0]?.lastPrice
                : tickerData.lastPrice;
            }
          } catch (error) {
            console.error("Failed to fetch current price for alert:", error);
          }

          const percentToTrigger =
            currentPrice > 0 ? Math.abs((targetPrice - currentPrice) / currentPrice) * 100 : 0;

          const newAlert: PriceAlert = {
            id: generateAlertId(),
            symbol,
            targetPrice,
            condition,
            currentPrice,
            percentToTrigger: parseFloat(percentToTrigger.toFixed(2)),
            createdAt: new Date().toISOString(),
          };

          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
              await Notification.requestPermission();
            }
            if (Notification.permission === "granted") {
              new Notification(`ClawLens: Price Alert Created`, {
                body: `${symbol} ${condition === "above" ? "↑" : "↓"} $${targetPrice.toLocaleString()}`,
                icon: "/logo_v1.webp",
              });
            }
          }

          alertsStore.set(newAlert.id, newAlert);
          saveAlerts(alertsStore);

          const direction = condition === "above" ? "↑" : "↓";
          return {
            success: true,
            data: {
              alert: newAlert,
            } as unknown as Record<string, unknown>,
            summary: `✅ Alert created: ${symbol} ${direction} $${targetPrice.toLocaleString()} (${percentToTrigger.toFixed(1)}% from current $${currentPrice.toLocaleString()})`,
          };
        }

        case "delete": {
          if (!alertId) {
            return {
              success: false,
              data: {},
              summary: "Alert ID is required for deletion",
              error: "Missing alertId",
            };
          }

          if (!alertsStore.has(alertId)) {
            return {
              success: false,
              data: {},
              summary: `Alert ${alertId} not found`,
              error: "Alert not found",
            };
          }

          const deleted = alertsStore.get(alertId);
          alertsStore.delete(alertId);
          saveAlerts(alertsStore);

          return {
            success: true,
            data: {
              deletedAlert: deleted,
            } as unknown as Record<string, unknown>,
            summary: `✅ Alert deleted: ${deleted?.symbol} at $${deleted?.targetPrice.toLocaleString()}`,
          };
        }

        case "check": {
          const triggeredAlerts: PriceAlert[] = [];
          const allAlerts = Array.from(alertsStore.values());

          const symbols = [...new Set(allAlerts.map((a) => a.symbol))];
          const priceMap: Record<string, number> = {};

          await Promise.all(
            symbols.map(async (sym) => {
              try {
                const tickerRes = await getTicker24hr(sym);
                if (tickerRes.success && tickerRes.data) {
                  const tickerData = tickerRes.data;
                  const price = Array.isArray(tickerData)
                    ? tickerData[0]?.lastPrice
                    : (tickerData as BinanceTicker24hr).lastPrice;
                  if (price) priceMap[sym] = price;
                }
              } catch (error) {
                console.error(`Failed to fetch price for ${sym}:`, error);
              }
            }),
          );

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
              triggeredAlerts.push({
                ...alert,
                currentPrice,
              });
            }
          }

          return {
            success: true,
            data: {
              triggeredAlerts,
              totalAlerts: allAlerts.length,
            } as unknown as Record<string, unknown>,
            summary:
              triggeredAlerts.length > 0
                ? `🚨 ${triggeredAlerts.length} alert(s) triggered: ${triggeredAlerts.map((a) => `${a.symbol} $${a.targetPrice.toLocaleString()}`).join(", ")}`
                : "No alerts currently triggered",
          };
        }

        case "list":
        default: {
          const allAlerts = Array.from(alertsStore.values());

          if (symbol) {
            const filtered = allAlerts.filter((a) => a.symbol === symbol);
            return {
              success: true,
              data: {
                alerts: filtered,
                count: filtered.length,
              } as unknown as Record<string, unknown>,
              summary:
                filtered.length > 0
                  ? `📋 ${filtered.length} alert(s) for ${symbol}:\n${filtered.map((a) => `• ${a.condition} $${a.targetPrice.toLocaleString()} (${a.percentToTrigger}% away)`).join("\n")}`
                  : `No alerts set for ${symbol}`,
            };
          }

          return {
            success: true,
            data: {
              alerts: allAlerts,
              count: allAlerts.length,
            } as unknown as Record<string, unknown>,
            summary:
              allAlerts.length > 0
                ? `📋 ${allAlerts.length} active alert(s):\n${allAlerts.map((a) => `• ${a.symbol} ${a.condition} $${a.targetPrice.toLocaleString()}`).join("\n")}`
                : "No price alerts set. Use action=create to add alerts.",
          };
        }
      }
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to manage price alerts" },
        summary: "Price alerts unavailable. Try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { UserTelegramClient } from "./userClient";
import { serverNotifications, NotificationType } from "@/lib/serverNotifications";
import { getTelegramBot } from "@/lib/keyVault";

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: "low" | "normal" | "high" | "urgent";
}

export class NotificationService {
  private supabase = getSupabaseAdmin();

  async send(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, message, data, priority = "normal" } = payload;

    await Promise.all([
      this.sendToApp(userId, type, title, message, data),
      this.sendToUserBot(userId, type, title, message, priority),
    ]);
  }

  private async sendToApp(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await serverNotifications.add(userId, type, title, message, data);
    } catch (error) {
      console.error("[NotificationService] Failed to add app notification:", error);
    }
  }

  private async sendToUserBot(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: string,
  ): Promise<void> {
    try {
      const botConfig = await getTelegramBot(userId);
      if (!botConfig || !botConfig.isActive) {
        console.log(`[NotificationService] User ${userId.slice(0, 8)} has no active bot`);
        return;
      }

      const chatId = await this.getUserChatId(userId);
      if (!chatId) {
        console.log(`[NotificationService] User ${userId.slice(0, 8)} has no linked chat`);
        return;
      }

      const settings = await this.getUserNotificationSettings(userId);
      if (!settings.telegramEnabled) {
        console.log(`[NotificationService] User ${userId.slice(0, 8)} has Telegram disabled`);
        return;
      }

      const emoji = this.getEmojiForType(type, priority);
      const formattedMessage = `${emoji} <b>${title}</b>\n\n${message}`;

      const bot = UserTelegramClient.fromConfig(botConfig);
      await bot.sendMessage(chatId, formattedMessage, {
        parse_mode: "HTML",
      });

      console.log(`[NotificationService] Sent ${type} notification to user ${userId.slice(0, 8)}`);
    } catch (error) {
      console.error("[NotificationService] Failed to send Telegram notification:", error);
    }
  }

  private getEmojiForType(type: NotificationType, priority: string): string {
    if (priority === "urgent") return "🚨";

    const emojis: Record<string, string> = {
      price_alert: "💰",
      whale_alert: "🐋",
      portfolio: "📊",
      news: "📰",
      system: "⚙️",
      trade: "📈",
      warning: "⚠️",
      watchlist: "👁️",
    };

    return emojis[type] || "📢";
  }

  private async getUserChatId(userId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from("telegram_connections")
      .select("telegram_chat_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    return parseInt(data.telegram_chat_id, 10);
  }

  async getUserNotificationSettings(userId: string): Promise<{
    telegramEnabled: boolean;
    appEnabled: boolean;
    priceAlerts: boolean;
    whaleAlerts: boolean;
    portfolioDigest: boolean;
    newsAlerts: boolean;
    digestTime: string;
  }> {
    const { data, error } = await this.supabase
      .from("telegram_connections")
      .select("notification_settings")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return {
        telegramEnabled: true,
        appEnabled: true,
        priceAlerts: true,
        whaleAlerts: true,
        portfolioDigest: true,
        newsAlerts: true,
        digestTime: "09:00",
      };
    }

    return {
      telegramEnabled: data.notification_settings?.telegramEnabled ?? true,
      appEnabled: data.notification_settings?.appEnabled ?? true,
      priceAlerts: data.notification_settings?.priceAlerts ?? true,
      whaleAlerts: data.notification_settings?.whaleAlerts ?? true,
      portfolioDigest: data.notification_settings?.portfolioDigest ?? true,
      newsAlerts: data.notification_settings?.newsAlerts ?? true,
      digestTime: data.notification_settings?.digestTime ?? "09:00",
    };
  }

  async updateUserNotificationSettings(
    userId: string,
    settings: Partial<{
      telegramEnabled: boolean;
      appEnabled: boolean;
      priceAlerts: boolean;
      whaleAlerts: boolean;
      portfolioDigest: boolean;
      newsAlerts: boolean;
      digestTime: string;
    }>,
  ): Promise<void> {
    const { data } = await this.supabase
      .from("telegram_connections")
      .select("notification_settings")
      .eq("user_id", userId)
      .single();

    const currentSettings = data?.notification_settings || {};
    const updatedSettings = { ...currentSettings, ...settings };

    await this.supabase
      .from("telegram_connections")
      .update({ notification_settings: updatedSettings })
      .eq("user_id", userId);
  }
}

export const notificationService = new NotificationService();

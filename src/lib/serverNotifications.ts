import { getSupabaseAdmin } from "@/lib/supabaseClient";

export type NotificationType =
  | "price_alert"
  | "whale_alert"
  | "portfolio"
  | "news"
  | "system"
  | "trade"
  | "warning"
  | "watchlist";

export interface ServerNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export class ServerNotificationService {
  private supabase = getSupabaseAdmin();

  async add(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        read: false,
      });
    } catch (error) {
      console.error("[ServerNotifications] Failed to add notification:", error);
    }
  }

  async get(userId: string, limit = 50): Promise<ServerNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("id", notificationId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }

  async delete(userId: string, notificationId: string): Promise<void> {
    await this.supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("id", notificationId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) return 0;
    return count || 0;
  }

  async cleanup(daysOld = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.supabase
      .from("notifications")
      .delete()
      .eq("read", true)
      .lt("created_at", cutoffDate.toISOString());
  }
}

export const serverNotifications = new ServerNotificationService();

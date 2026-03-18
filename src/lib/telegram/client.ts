import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { TelegramConnection } from "@/types";

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export class TelegramClient {
  private supabase = getSupabaseAdmin();

  async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<void> {
    const url = `${TELEGRAM_API_URL}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
  }

  async sendChatAction(chatId: number, action: string = "typing"): Promise<void> {
    const url = `${TELEGRAM_API_URL}/sendChatAction`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
  }

  async sendPhoto(chatId: number, photo: string, caption?: string): Promise<void> {
    const url = `${TELEGRAM_API_URL}/sendPhoto`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption,
        parse_mode: "HTML",
      }),
    });
  }

  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    replyMarkup?: any,
  ): Promise<void> {
    const url = `${TELEGRAM_API_URL}/editMessageText`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    const url = `${TELEGRAM_API_URL}/answerCallbackQuery`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  }

  async setWebhook(url: string, secretToken: string): Promise<void> {
    const apiUrl = `${TELEGRAM_API_URL}/setWebhook`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: secretToken,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Failed to set webhook: ${data.description}`);
    }
  }

  async deleteWebhook(): Promise<void> {
    const url = `${TELEGRAM_API_URL}/deleteWebhook`;
    await fetch(url, { method: "POST" });
  }

  async getMe(): Promise<{ id: number; username: string; first_name: string }> {
    const url = `${TELEGRAM_API_URL}/getMe`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to get bot info: ${data.description}`);
    }

    return data.result;
  }

  async linkUser(
    chatId: number,
    userId: string,
    telegramUserId: number,
    username?: string,
    firstName?: string,
  ): Promise<void> {
    const { error } = await this.supabase.from("telegram_connections").upsert(
      {
        user_id: userId,
        telegram_chat_id: String(chatId),
        telegram_user_id: String(telegramUserId),
        username,
        first_name: firstName,
        is_active: true,
        last_message_at: new Date().toISOString(),
      },
      {
        onConflict: "telegram_chat_id",
      },
    );

    if (error) {
      console.error("[TelegramClient] Error linking user:", error);
      throw new Error("Failed to link account");
    }
  }

  async unlinkUser(chatId: number): Promise<void> {
    const { error } = await this.supabase
      .from("telegram_connections")
      .update({ is_active: false })
      .eq("telegram_chat_id", String(chatId));

    if (error) {
      console.error("[TelegramClient] Error unlinking user:", error);
      throw new Error("Failed to unlink account");
    }
  }

  async getUserByChatId(chatId: number): Promise<TelegramConnection | null> {
    const { data, error } = await this.supabase
      .from("telegram_connections")
      .select("*")
      .eq("telegram_chat_id", String(chatId))
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      telegramChatId: data.telegram_chat_id,
      telegramUserId: data.telegram_user_id,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      isActive: data.is_active,
      lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : undefined,
      createdAt: new Date(data.created_at),
    };
  }

  async generateLinkCode(userId: string): Promise<string> {
    const code = `link_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const { error } = await this.supabase.from("telegram_connections").insert({
      user_id: userId,
      telegram_chat_id: "pending",
      is_active: false,
    });

    if (error) {
      console.error("[TelegramClient] Error generating link code:", error);
      throw new Error("Failed to generate link code");
    }

    return code;
  }
}

export const telegramClient = new TelegramClient();

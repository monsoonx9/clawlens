import { TelegramBotConfig } from "@/lib/keyVault";

export class UserTelegramClient {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<void> {
    const url = `${this.baseUrl}/sendMessage`;

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

  async sendPhoto(chatId: number, photo: string, caption?: string): Promise<void> {
    const url = `${this.baseUrl}/sendPhoto`;

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
    const url = `${this.baseUrl}/editMessageText`;

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
    const url = `${this.baseUrl}/answerCallbackQuery`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  }

  async setWebhook(url: string, secretToken: string): Promise<boolean> {
    const apiUrl = `${this.baseUrl}/setWebhook`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: secretToken,
      }),
    });

    const data = await response.json();
    return data.ok;
  }

  async deleteWebhook(): Promise<boolean> {
    const url = `${this.baseUrl}/deleteWebhook`;
    const response = await fetch(url, { method: "POST" });
    const data = await response.json();
    return data.ok;
  }

  async getMe(): Promise<{ id: number; username: string; first_name: string } | null> {
    const url = `${this.baseUrl}/getMe`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return null;
    }

    return data.result;
  }

  static fromConfig(config: TelegramBotConfig): UserTelegramClient {
    return new UserTelegramClient(config.botToken);
  }
}

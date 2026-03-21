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

  async setMyCommands(commands: Array<{ command: string; description: string }>): Promise<boolean> {
    const url = `${this.baseUrl}/setMyCommands`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: commands.map((c) => ({ command: c.command, description: c.description })),
      }),
    });
    const data = await response.json();
    return data.ok;
  }

  async setChatMenuButton(): Promise<boolean> {
    const url = `${this.baseUrl}/setChatMenuButton`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: { type: "commands" },
      }),
    });
    const data = await response.json();
    return data.ok;
  }

  async sendChatAction(
    chatId: number,
    action:
      | "typing"
      | "upload_photo"
      | "upload_video"
      | "upload_document"
      | "find_location"
      | "record_video"
      | "record_voice"
      | "upload_voice" = "typing",
  ): Promise<void> {
    const url = `${this.baseUrl}/sendChatAction`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
  }

  async sendTyping(chatId: number): Promise<void> {
    return this.sendChatAction(chatId, "typing");
  }

  static fromConfig(config: TelegramBotConfig): UserTelegramClient {
    return new UserTelegramClient(config.botToken);
  }
}

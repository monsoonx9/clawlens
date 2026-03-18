import { telegramClient } from "./client";
import { getMainKeyboard, getSettingsKeyboard, getAlertsKeyboard } from "./keyboards";

interface CommandContext {
  chatId: number;
  userId?: string;
  username?: string;
  firstName?: string;
}

export const COMMANDS = {
  start: {
    name: "start",
    description: "Start the bot and get welcome message",
  },
  help: {
    name: "help",
    description: "Show help menu and available commands",
  },
  link: {
    name: "link",
    description: "Link your Telegram to your web account",
  },
  unlink: {
    name: "unlink",
    description: "Unlink your Telegram from your web account",
  },
  portfolio: {
    name: "portfolio",
    description: "Get your portfolio summary",
  },
  price: {
    name: "price",
    description: "Get price of a token (e.g., /price BTC)",
  },
  alerts: {
    name: "alerts",
    description: "Manage your price alerts",
  },
  settings: {
    name: "settings",
    description: "Bot settings and preferences",
  },
  ask: {
    name: "ask",
    description: "Ask a quick question (e.g., /ask what's the price of ETH?)",
  },
};

export async function handleStartCommand(context: CommandContext): Promise<string> {
  const user = await telegramClient.getUserByChatId(context.chatId);

  if (user) {
    return `Welcome back, ${context.firstName || "there"}! 👋

You're already linked to your ClawLens account.

Use /help to see available commands, or just ask me anything!`;
  }

  return `Welcome to ClawLens Bot, ${context.firstName || "there"}! 👋

I'm your personal AI trading assistant. I can help you with:

📊 <b>Portfolio</b> - View your portfolio
💰 <b>Prices</b> - Get token prices
🔔 <b>Alerts</b> - Set price alerts
⚙️ <b>Settings</b> - Customize your experience

To get started, link your account with /link or just ask me anything!

Type /help for all commands.`;
}

export async function handleHelpCommand(context: CommandContext): Promise<string> {
  return `🛠 <b>Available Commands</b>

/start - Welcome message
/help - Show this menu
/link - Link your account
/unlink - Unlink your account

📊 <b>Portfolio</b>
/portfolio - Your portfolio summary

💰 <b>Prices</b>
/price [symbol] - Get token price (e.g., /price BTC)

🔔 <b>Alerts</b>
/alerts - Manage price alerts

⚙️ <b>Settings</b>
/settings - Bot preferences

💬 <b>Quick Ask</b>
/ask [question] - Quick question

Just send me a message and I'll help you with anything!`;
}

export async function handleLinkCommand(
  context: CommandContext,
): Promise<{ text: string; keyboard?: any }> {
  return {
    text: `🔗 <b>Link Your Account</b>

To link your Telegram to your ClawLens web account:

1. Go to your ClawLens dashboard
2. Navigate to Settings
3. Look for "Telegram Connection"
4. Enter this chat ID: <code>${context.chatId}</code>

Once linked, you'll be able to access your portfolio and receive alerts directly in Telegram!`,
    keyboard: getMainKeyboard(),
  };
}

export async function handleUnlinkCommand(context: CommandContext): Promise<string> {
  const user = await telegramClient.getUserByChatId(context.chatId);

  if (!user) {
    return "Your Telegram is not linked to any account.";
  }

  await telegramClient.unlinkUser(context.chatId);

  return "✅ Your Telegram has been unlinked from your ClawLens account.";
}

export async function handlePortfolioCommand(context: CommandContext): Promise<string> {
  const user = await telegramClient.getUserByChatId(context.chatId);

  if (!user) {
    return "❌ Please link your account first with /link";
  }

  return `📊 <b>Portfolio</b>

I'm fetching your portfolio now! You can also just ask me:
• "Show my portfolio"
• "What's my PnL?"
• "How risky is my portfolio?"

I'll analyze your Binance holdings with real-time data.`;
}

export async function handlePriceCommand(context: CommandContext, args: string): Promise<string> {
  const symbol = args.trim().toUpperCase();

  if (!symbol) {
    return "Please specify a symbol. Example: /price BTC";
  }

  return `💰 <b>${symbol}</b>

Just ask me directly! For example:
• "What's the price of ${symbol}?"
• "${symbol} technical analysis"
• "Is ${symbol} a good buy?"

I'll fetch live data from Binance and analyze it for you.`;
}

export async function handleAlertsCommand(
  context: CommandContext,
): Promise<{ text: string; keyboard?: any } | string> {
  const user = await telegramClient.getUserByChatId(context.chatId);

  if (!user) {
    return "❌ Please link your account first with /link";
  }

  return {
    text: "🔔 <b>Price Alerts</b>\n\nManage your price alerts:",
    keyboard: getAlertsKeyboard(),
  };
}

export async function handleSettingsCommand(
  context: CommandContext,
): Promise<{ text: string; keyboard?: any } | string> {
  return {
    text: "⚙️ <b>Settings</b>\n\nCustomize your experience:",
    keyboard: getSettingsKeyboard(),
  };
}

export async function handleAskCommand(context: CommandContext, question: string): Promise<string> {
  const user = await telegramClient.getUserByChatId(context.chatId);

  if (!user) {
    return "❌ Please link your account first with /link to use AI features.";
  }

  if (!question.trim()) {
    return "Please provide a question. Example: /ask what's the price of ETH?";
  }

  return `🤖 Processing your question: "<i>${question}</i>"

Please wait while I fetch the data...`;
}

export function parseCommand(text: string): { command: string; args: string } | null {
  const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return null;

  return {
    command: match[1].toLowerCase(),
    args: match[2] || "",
  };
}

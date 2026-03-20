export function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: "📊 Portfolio" }],
      [{ text: "💰 Price" }],
      [{ text: "🔔 Alerts" }],
      [{ text: "⚙️ Settings" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getSettingsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🔔 Notifications", callback_data: "settings_notifications" },
        { text: "📊 Portfolio Access", callback_data: "settings_portfolio" },
      ],
      [
        { text: "🔗 Link Account", callback_data: "settings_link" },
        { text: "❌ Unlink", callback_data: "settings_unlink" },
      ],
      [{ text: "« Back", callback_data: "back_main" }],
    ],
  };
}

export function getAlertsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "+ Add Alert", callback_data: "alerts_add" }],
      [{ text: "📋 View Alerts", callback_data: "alerts_list" }],
      [{ text: "🗑 Delete Alert", callback_data: "alerts_delete" }],
      [{ text: "« Back", callback_data: "back_main" }],
    ],
  };
}

export function getPortfolioKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📈 P&L", callback_data: "portfolio_pnl" }],
      [{ text: "💼 Holdings", callback_data: "portfolio_holdings" }],
      [{ text: "📊 Analysis", callback_data: "portfolio_analysis" }],
      [{ text: "« Back", callback_data: "back_main" }],
    ],
  };
}

export function getHelpKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📊 Portfolio", callback_data: "help_portfolio" },
        { text: "💰 Prices", callback_data: "help_prices" },
      ],
      [
        { text: "🐋 Whales", callback_data: "help_whales" },
        { text: "🔔 Alerts", callback_data: "help_alerts" },
      ],
      [
        { text: "📈 Analysis", callback_data: "help_analysis" },
        { text: "🛡️ Rug Check", callback_data: "help_rug" },
      ],
      [{ text: "« Back", callback_data: "back_main" }],
    ],
  };
}

export function getPriceKeyboard(symbol?: string) {
  return {
    inline_keyboard: [
      [
        { text: "📈 Chart", callback_data: `price_chart_${symbol}` },
        { text: "🔔 Alert", callback_data: `price_alert_${symbol}` },
      ],
      [{ text: "« Back", callback_data: "back_main" }],
    ],
  };
}

export function getConfirmKeyboard(action: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: `confirm_${action}` },
        { text: "❌ Cancel", callback_data: `cancel_${action}` },
      ],
    ],
  };
}

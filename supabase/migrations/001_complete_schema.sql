-- =====================================================
-- ClawLens Complete Database Schema
-- Run this script to create all required tables for ClawLens
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: encrypted_keys
-- Stores encrypted API keys for users
-- =====================================================
CREATE TABLE IF NOT EXISTS encrypted_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    encrypted_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- Table: price_alerts
-- Stores user price alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    target_price NUMERIC NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
    triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: whale_wallets
-- Stores tracked whale wallet addresses
-- =====================================================
CREATE TABLE IF NOT EXISTS whale_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    wallet_address TEXT NOT NULL,
    nickname TEXT,
    network TEXT DEFAULT 'ethereum',
    min_amount NUMERIC DEFAULT 100000,
    notification_settings JSONB DEFAULT '{"whaleAlerts": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, wallet_address)
);

-- =====================================================
-- Table: telegram_connections
-- Stores Telegram bot connections
-- =====================================================
CREATE TABLE IF NOT EXISTS telegram_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    telegram_chat_id BIGINT,
    telegram_user_id BIGINT,
    username TEXT,
    first_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    notification_settings JSONB DEFAULT '{
        "priceAlerts": true,
        "whaleAlerts": true,
        "portfolioDigest": false,
        "newsAlerts": true,
        "digestTime": "09:00"
    }',
    last_digest_sent TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(telegram_chat_id)
);

-- =====================================================
-- Table: notifications
-- Stores notification history
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    data JSONB,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: watchlist
-- Stores user watchlist items
-- =====================================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    contract_address TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    chain TEXT DEFAULT 'ethereum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, contract_address)
);

-- =====================================================
-- Table: trade_journal
-- Stores trade journal entries
-- =====================================================
CREATE TABLE IF NOT EXISTS trade_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trade_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    price NUMERIC NOT NULL,
    quantity NUMERIC NOT NULL,
    quote_quantity NUMERIC NOT NULL,
    commission NUMERIC DEFAULT 0,
    commission_asset TEXT,
    trade_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: personal_assistant_sessions
-- Stores Personal Assistant conversation sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_assistant_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    title TEXT DEFAULT 'New Conversation',
    preferences JSONB DEFAULT '{"personality": "balanced", "lastInvokedSkills": [], "lastInvokedAt": null}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

-- =====================================================
-- Table: personal_assistant_messages
-- Stores Personal Assistant chat messages
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_assistant_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES personal_assistant_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    skills_used TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: user_assistant_preferences
-- Stores user preferences for the Personal Assistant
-- =====================================================
CREATE TABLE IF NOT EXISTS user_assistant_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    personality TEXT DEFAULT 'adaptive',
    language TEXT DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT TRUE,
    portfolio_access BOOLEAN DEFAULT TRUE,
    trade_access BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_encrypted_keys_user_id ON encrypted_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON price_alerts(triggered) WHERE triggered = FALSE;
CREATE INDEX IF NOT EXISTS idx_whale_wallets_user_id ON whale_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_user_id ON telegram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat_id ON telegram_connections(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_id ON trade_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON trade_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_journal_time ON trade_journal(trade_time DESC);
CREATE INDEX IF NOT EXISTS idx_personal_sessions_user_id ON personal_assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_sessions_session_id ON personal_assistant_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_personal_messages_session_id ON personal_assistant_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_user_assistant_preferences_user_id ON user_assistant_preferences(user_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on tables that use Supabase Auth (UUID user_id)
ALTER TABLE encrypted_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whale_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;

-- Personal Assistant tables use custom session IDs (TEXT) and access control
-- is handled at the application layer via service_role (bypasses RLS).
-- RLS is DISABLED on these tables to avoid conflicts with application-level auth.
ALTER TABLE personal_assistant_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_assistant_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_assistant_preferences DISABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
-- Note: Tables with user_id UUID use auth.uid() for RLS

CREATE POLICY "Users can access own encrypted keys" ON encrypted_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own price alerts" ON price_alerts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own whale wallets" ON whale_wallets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own telegram connections" ON telegram_connections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own watchlist" ON watchlist
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own trade journal" ON trade_journal
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE encrypted_keys IS 'Stores encrypted API keys for users (Binance, LLM, etc.)';
COMMENT ON TABLE price_alerts IS 'User-configured price alerts for tokens';
COMMENT ON TABLE whale_wallets IS 'Tracked whale wallet addresses for monitoring';
COMMENT ON TABLE telegram_connections IS 'Telegram bot connections for user notifications';
COMMENT ON TABLE notifications IS 'Notification history for user activity';
COMMENT ON TABLE watchlist IS 'User watchlist of tokens to monitor';
COMMENT ON TABLE trade_journal IS 'Trade history imported from exchange';
COMMENT ON TABLE personal_assistant_sessions IS 'Personal Assistant conversation sessions (RLS disabled - uses app-level auth)';
COMMENT ON TABLE personal_assistant_messages IS 'Personal Assistant chat messages (RLS disabled - uses app-level auth)';
COMMENT ON TABLE user_assistant_preferences IS 'User preferences for the Personal Assistant (RLS disabled - uses app-level auth)';

-- =====================================================
-- Grant permissions for service role (backend operations)
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

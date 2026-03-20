-- =====================================================
-- CLAWLENS DATABASE SCHEMA
-- Telegram Bot Integration + Personal Assistant
-- =====================================================
-- This schema is migration-safe:
-- - Uses IF NOT EXISTS for new tables
-- - Uses ADD COLUMN IF NOT EXISTS for new columns
-- - Existing data is preserved
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MIGRATION: Add columns to EXISTING tables
-- Run these FIRST to update existing tables
-- =====================================================

-- Add notification_settings to existing telegram_connections
ALTER TABLE telegram_connections 
    ADD COLUMN IF NOT EXISTS notification_settings JSONB;

-- Add last_digest_sent to existing telegram_connections
ALTER TABLE telegram_connections 
    ADD COLUMN IF NOT EXISTS last_digest_sent TIMESTAMP WITH TIME ZONE;

-- Add triggered column to existing price_alerts
ALTER TABLE price_alerts 
    ADD COLUMN IF NOT EXISTS triggered BOOLEAN DEFAULT false;

-- =====================================================
-- NEW TABLES: whale_wallets
-- User-tracked whale wallet addresses
-- =====================================================
CREATE TABLE IF NOT EXISTS whale_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    nickname TEXT,
    network TEXT DEFAULT 'bsc',
    min_amount NUMERIC DEFAULT 10000,
    alert_enabled BOOLEAN DEFAULT true,
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whale_wallets_user_id 
    ON whale_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_whale_wallets_address 
    ON whale_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_whale_wallets_network 
    ON whale_wallets(network);

-- =====================================================
-- NEW TABLES: notifications
-- Full notification history for in-app panel
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority TEXT DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read 
    ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at DESC);

-- =====================================================
-- NEW TABLES: watchlist
-- User's watched tokens with alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    target_price_above NUMERIC,
    target_price_below NUMERIC,
    price_change_percent NUMERIC,
    alert_enabled BOOLEAN DEFAULT true,
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id 
    ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol 
    ON watchlist(symbol);

-- =====================================================
-- NEW TABLES: trade_journal
-- Track user's trading history
-- =====================================================
CREATE TABLE IF NOT EXISTS trade_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    pnl NUMERIC,
    pnl_percent NUMERIC,
    status TEXT DEFAULT 'open',
    notes TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_trade_journal_user_id 
    ON trade_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol 
    ON trade_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_journal_status 
    ON trade_journal(status);

-- =====================================================
-- INDEXES: Create indexes that depend on new columns
-- Run these AFTER adding columns to existing tables
-- =====================================================

-- Index for finding active (not triggered) price alerts
-- This helps the cron job find alerts that haven't been triggered yet
DO $$
BEGIN
    -- Check if the column exists before creating the index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'price_alerts' 
        AND column_name = 'triggered'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered 
            ON price_alerts(triggered) WHERE triggered = false;
    END IF;
END $$;

-- =====================================================
-- EXISTING TABLES: Ensure indexes exist
-- (May already exist from initial setup)
-- =====================================================

-- personal_assistant_sessions indexes
CREATE INDEX IF NOT EXISTS idx_personal_sessions_user_id 
    ON personal_assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_sessions_session_id 
    ON personal_assistant_sessions(session_id);

-- personal_assistant_messages indexes
CREATE INDEX IF NOT EXISTS idx_personal_messages_session_id 
    ON personal_assistant_messages(session_id);

-- telegram_connections indexes
CREATE INDEX IF NOT EXISTS idx_telegram_user_id 
    ON telegram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id 
    ON telegram_connections(telegram_chat_id);

-- price_alerts indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id 
    ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol 
    ON price_alerts(symbol);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for user data isolation
-- Only enable if RLS is not already enabled
-- =====================================================

-- Check and enable RLS for whale_wallets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'whale_wallets'
        AND n.nspname = 'public'
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE whale_wallets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Check and enable RLS for notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'notifications'
        AND n.nspname = 'public'
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Check and enable RLS for watchlist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'watchlist'
        AND n.nspname = 'public'
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Check and enable RLS for trade_journal
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'trade_journal'
        AND n.nspname = 'public'
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- PRIVILEGE GRANTS
-- Ensure service role can access all tables
-- =====================================================

GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role, postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- VERIFICATION: Check what was added
-- =====================================================

-- Check new tables
SELECT 'New Tables Created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whale_wallets', 'notifications', 'watchlist', 'trade_journal');

-- Check new columns in existing tables
SELECT 'Columns Added to Existing Tables:' as status;
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (
    (table_name = 'telegram_connections' AND column_name IN ('notification_settings', 'last_digest_sent'))
    OR (table_name = 'price_alerts' AND column_name = 'triggered')
)
ORDER BY table_name, column_name;

-- Check indexes
SELECT 'Indexes Created:' as status;
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

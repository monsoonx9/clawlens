-- =====================================================
-- CLAWLENS PERSONAL ASSISTANT DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PERSONAL ASSISTANT SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_assistant_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_sessions_user_id 
    ON personal_assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_sessions_session_id 
    ON personal_assistant_sessions(session_id);

-- =====================================================
-- PERSONAL ASSISTANT MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_assistant_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES personal_assistant_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    skills_used TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_messages_session_id 
    ON personal_assistant_messages(session_id);

-- =====================================================
-- TELEGRAM CONNECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS telegram_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    telegram_chat_id TEXT UNIQUE NOT NULL,
    telegram_user_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_user_id 
    ON telegram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id 
    ON telegram_connections(telegram_chat_id);

-- =====================================================
-- PRICE ALERTS (for Telegram)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    target_price NUMERIC,
    condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'change')),
    change_percent NUMERIC,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id 
    ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol 
    ON price_alerts(symbol);

-- =====================================================
-- USER PREFERENCES (for Personal Assistant)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_assistant_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    personality TEXT DEFAULT 'adaptive' CHECK (personality IN ('friendly', 'professional', 'adaptive', 'technical')),
    language TEXT DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT true,
    portfolio_access BOOLEAN DEFAULT true,
    trade_access BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EXPLICIT PRIVILEGE GRANTS
-- Fixes "42501 - permission denied for table" errors
-- =====================================================
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role, postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

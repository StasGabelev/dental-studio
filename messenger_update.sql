-- Add Viber and WhatsApp configuration to ai_settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS viber_bot_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS tg_patient_bot_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS wa_bot_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS wa_link TEXT;

-- Descriptive comments for the database schema
COMMENT ON COLUMN ai_settings.viber_bot_token IS 'Viber Bot Token from Viber Partner Panel';
COMMENT ON COLUMN ai_settings.wa_link IS 'Direct WhatsApp link for human fallback (e.g., https://wa.me/380...)';

-- Table for linking external messenger users to our chat sessions
CREATE TABLE IF NOT EXISTS messenger_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL, -- 'telegram', 'viber'
    platform_user_id TEXT NOT NULL,
    session_id UUID REFERENCES chat_sessions(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(platform, platform_user_id)
);

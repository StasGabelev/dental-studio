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

-- Update chat_sessions contact_type constraint to allow new platforms
-- Note: Depending on PostgreSQL version, you might need to drop and recreate the constraint
DO $$ 
BEGIN 
    ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_contact_type_check;
    ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_contact_type_check 
        CHECK (contact_type IN ('email', 'phone', 'telegram', 'viber'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update constraint, might not exist or already updated';
END $$;

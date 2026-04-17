-- Add Telegram Notification settings to ai_settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS tg_bot_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS tg_chat_id TEXT;

-- Recommended: Add comments for clarity
COMMENT ON COLUMN ai_settings.tg_bot_token IS 'Telegram Bot Token from @BotFather';
COMMENT ON COLUMN ai_settings.tg_chat_id IS 'Admin Chat ID for receiving notifications';

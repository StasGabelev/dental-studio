-- Upgrade Chat Sessions to CRM
-- Add new columns for client identification and status

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS client_surname TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

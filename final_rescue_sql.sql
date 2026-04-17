-- ============================================================
-- FINAL RESCUE SQL: FIX PERMISSIONS & SCHEMA FOR CHAT/CRM
-- ============================================================

-- 1. Ensure all columns exist in chat_sessions
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS client_surname TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Ensure knowledge_base_manual exists in ai_settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS knowledge_base_manual TEXT;

-- 3. Reset and fix RLS Policies for chat_sessions
-- We need to allow the Bot (anon) to UPDATE sessions (for names and last_message_at)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "public_select_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "public_update_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "anon_select_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "auth_all_sessions" ON chat_sessions;

-- Anon (Bot) policies
CREATE POLICY "anon_insert_sessions" ON chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_sessions" ON chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_sessions" ON chat_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Auth (Admin) policies
CREATE POLICY "auth_all_sessions" ON chat_sessions FOR ALL TO authenticated USING (true);

-- 4. Fix permissions for chat_messages (Bot and Admin)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_messages" ON chat_messages;
DROP POLICY IF EXISTS "anon_select_messages" ON chat_messages;
DROP POLICY IF EXISTS "auth_all_messages" ON chat_messages;

CREATE POLICY "anon_insert_messages" ON chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_messages" ON chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_messages" ON chat_messages FOR ALL TO authenticated USING (true);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_msg ON chat_sessions(last_message_at DESC);

-- 6. Grant basic sequences (just in case)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

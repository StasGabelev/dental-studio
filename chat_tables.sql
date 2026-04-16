-- Chat Sessions & Messages for Dental Studio
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_contact TEXT NOT NULL,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (clients) and authenticated to read (admin)
CREATE POLICY "anon_insert_sessions" ON chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_sessions" ON chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_sessions" ON chat_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "anon_insert_messages" ON chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_messages" ON chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_messages" ON chat_messages FOR ALL TO authenticated USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last ON chat_sessions(last_message_at DESC);

-- AI Settings table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model TEXT,
    system_prompt TEXT,
    custom_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admin) to read and write
CREATE POLICY "auth_all_ai_settings" ON ai_settings FOR ALL TO authenticated USING (true);

-- Allow anon to only read (so widget can connect to AI)
CREATE POLICY "anon_select_ai_settings" ON ai_settings FOR SELECT TO anon USING (true);

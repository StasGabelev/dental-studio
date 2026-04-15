-- ============================================================
-- DENTAL STUDIO — SECURE DATABASE FIX
-- Run this in Supabase SQL Editor to resolve RLS vulnerabilities
-- ============================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- This ensures that NO data is accessible unless a policy allows it.
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 2. CLEANUP ALL POTENTIAL CONFLICTS
-- We drop both old and new policy names to ensure a fresh start.
DROP POLICY IF EXISTS "Public read site_content" ON site_content;
DROP POLICY IF EXISTS "Public read price_list" ON price_list;
DROP POLICY IF EXISTS "Public read doctors" ON doctors;
DROP POLICY IF EXISTS "Public read cases" ON cases;
DROP POLICY IF EXISTS "Auth write site_content" ON site_content;
DROP POLICY IF EXISTS "Auth write price_list" ON price_list;
DROP POLICY IF EXISTS "Auth write doctors" ON doctors;
DROP POLICY IF EXISTS "Auth write cases" ON cases;
DROP POLICY IF EXISTS "Auth write ai_settings" ON ai_settings;
DROP POLICY IF EXISTS "Public insert chat_logs" ON chat_logs;
DROP POLICY IF EXISTS "Auth read chat_logs" ON chat_logs;

-- Drop new names (in case of retry)
DROP POLICY IF EXISTS "Allow public read site_content" ON site_content;
DROP POLICY IF EXISTS "Allow public read price_list" ON price_list;
DROP POLICY IF EXISTS "Allow public read doctors" ON doctors;
DROP POLICY IF EXISTS "Allow public read cases" ON cases;
DROP POLICY IF EXISTS "Allow public insert chat_logs" ON chat_logs;
DROP POLICY IF EXISTS "Allow auth all site_content" ON site_content;
DROP POLICY IF EXISTS "Allow auth all price_list" ON price_list;
DROP POLICY IF EXISTS "Allow auth all doctors" ON doctors;
DROP POLICY IF EXISTS "Allow auth all cases" ON cases;
DROP POLICY IF EXISTS "Allow auth all ai_settings" ON ai_settings;
DROP POLICY IF EXISTS "Allow auth all chat_logs" ON chat_logs;
DROP POLICY IF EXISTS "Allow auth all knowledge" ON knowledge_chunks;

-- 3. CREATE NEW SECURE POLICIES


-- --- PUBLIC ACCESS (Website) ---
-- These tables ARE visible to website visitors (anon key)
CREATE POLICY "Allow public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Allow public read price_list" ON price_list FOR SELECT USING (true);
CREATE POLICY "Allow public read doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Allow public read cases" ON cases FOR SELECT USING (true);

-- --- CHAT WIDGET ACCESS ---
-- Visitors can send messages, but CANNOT read the chat history of others
CREATE POLICY "Allow public insert chat_logs" ON chat_logs FOR INSERT WITH CHECK (true);

-- --- KNOWLEDGE BASE (RAG) ---
-- If the chatbot needs to read chunks from the frontend, uncomment the line below.
-- Otherwise, it remains restricted to the admin/service_role only.
-- CREATE POLICY "Allow public read knowledge" ON knowledge_chunks FOR SELECT USING (true);

-- --- ADMIN ACCESS (Dashboard) ---
-- Only authenticated users (you) can modify data
CREATE POLICY "Allow auth all site_content" ON site_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all price_list" ON price_list FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all doctors" ON doctors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all cases" ON cases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all ai_settings" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all chat_logs" ON chat_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow auth all knowledge" ON knowledge_chunks FOR ALL USING (auth.role() = 'authenticated');

-- 4. CONFIRM SENSITIVE DATA PROTECTION
-- Note: There is NO SELECT policy for 'ai_settings' for public/anon.
-- This means your API keys are now protected from being read via the frontend.

-- 5. STORAGE BUCKET POLICIES (Re-verification)
-- Storage RLS is usually managed by Supabase automatically.
-- We only update the access policies here.

DROP POLICY IF EXISTS "Public read clinic-media" ON storage.objects;

DROP POLICY IF EXISTS "Auth upload clinic-media" ON storage.objects;

CREATE POLICY "Public read clinic-media" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-media');
CREATE POLICY "Auth manage clinic-media" ON storage.objects FOR ALL USING (bucket_id = 'clinic-media' AND auth.role() = 'authenticated');

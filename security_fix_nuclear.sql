-- ============================================================
-- DENTAL STUDIO — NUCLEAR SECURITY REPAIR (FORCE CLEANUP)
-- This script WIPES ALL EXISTING POLICIES and sets only secure ones.
-- ============================================================

DO $$ 
DECLARE 
    current_table text;
    tables_to_fix text[] := ARRAY['site_content', 'price_list', 'doctors', 'cases', 'ai_settings', 'chat_logs', 'knowledge_chunks'];
    pol record;
BEGIN
    FOREACH current_table IN ARRAY tables_to_fix LOOP
        -- 1. Ensure RLS is enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', current_table);
        
        -- 2. Delete EVERY SINGLE existing policy on this table (Cleanup)
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = current_table AND schemaname = 'public' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, current_table);
        END LOOP;
    END LOOP;
END $$;

-- 3. RECREATE ONLY SECURE POLICIES FROM SCRATCH

-- --- SITE_CONTENT ---
CREATE POLICY "Allow public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Allow auth all site_content" ON site_content FOR ALL USING (auth.role() = 'authenticated');

-- --- PRICE_LIST ---
CREATE POLICY "Allow public read price_list" ON price_list FOR SELECT USING (true);
CREATE POLICY "Allow auth all price_list" ON price_list FOR ALL USING (auth.role() = 'authenticated');

-- --- DOCTORS ---
CREATE POLICY "Allow public read doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Allow auth all doctors" ON doctors FOR ALL USING (auth.role() = 'authenticated');

-- --- CASES ---
CREATE POLICY "Allow public read cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Allow auth all cases" ON cases FOR ALL USING (auth.role() = 'authenticated');

-- --- CHAT_LOGS ---
CREATE POLICY "Allow public insert chat_logs" ON chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow auth all chat_logs" ON chat_logs FOR ALL USING (auth.role() = 'authenticated');

-- --- AI_SETTINGS (SENSITIVE) ---
-- No public SELECT! Only admin.
CREATE POLICY "Allow auth all ai_settings" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');

-- --- KNOWLEDGE_CHUNKS ---
CREATE POLICY "Allow auth all knowledge" ON knowledge_chunks FOR ALL USING (auth.role() = 'authenticated');

-- 4. RE-VERIFY STORAGE (Cleanup and Reset)
-- Note: managing storage.objects policies usually needs to be done explicitly
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public read clinic-media" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-media');
CREATE POLICY "Auth manage clinic-media" ON storage.objects FOR ALL USING (bucket_id = 'clinic-media' AND auth.role() = 'authenticated');

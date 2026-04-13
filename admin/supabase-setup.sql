-- ============================================================
-- DENTAL STUDIO — Supabase Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable pgvector extension for RAG / Knowledge Base
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. SITE CONTENT (text/media for all pages)
-- ============================================================
CREATE TABLE site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug TEXT NOT NULL,
    section_key TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    value_uk TEXT,
    value_ru TEXT,
    value_en TEXT,
    media_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(page_slug, section_key)
);

-- Default content for homepage
INSERT INTO site_content (page_slug, section_key, content_type, value_uk) VALUES
('home', 'hero-title', 'text', 'ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍'),
('home', 'hero-subtitle', 'text', 'Від ідеальної гігієни до імплантів ''під ключ''. Онлайн-запис за посиланням ⬇️'),
('home', 'about-p1', 'text', 'Dental Studio — це стоматологічна клініка в Чернігові, що об''єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.'),
('home', 'about-p2', 'text', 'Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів.'),
('contact', 'contact-address', 'text', 'ПРОСПЕКТ БЕРЕСТЕЙСЬКИЙ, 5В КИЇВ, УКРАЇНА'),
('contact', 'contact-phone', 'text', '(077) 600 7 800'),
('contact', 'contact-hours', 'text', 'Пн — Пт, 10:00 — 18:00');

-- ============================================================
-- 2. PRICE LIST
-- ============================================================
CREATE TABLE price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    service_name_uk TEXT NOT NULL,
    service_name_ru TEXT,
    price_from INTEGER,
    price_to INTEGER,
    price_display TEXT,
    currency TEXT DEFAULT 'UAH',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO price_list (category, service_name_uk, price_display, sort_order) VALUES
('Терапія', 'Консультація лікаря', '500 грн', 1),
('Терапія', 'Пломбування зуба', 'від 1200 грн', 2),
('Хірургія', 'Видалення зуба', 'від 800 грн', 3),
('Хірургія', 'Імплантація', 'від 15000 грн', 4),
('Естетика', 'Професійне відбілювання', 'від 4500 грн', 5),
('Ортодонтія', 'Брекет-система', 'від 25000 грн', 6),
('Гігієна', 'Професійна гігієна (чистка)', 'від 1500 грн', 7);

-- ============================================================
-- 3. DOCTORS
-- ============================================================
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_uk TEXT NOT NULL,
    name_ru TEXT,
    specialization_uk TEXT,
    specialization_ru TEXT,
    photo_url TEXT,
    bio_uk TEXT,
    bio_ru TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO doctors (name_uk, specialization_uk, sort_order) VALUES
('Др. Іванов А.В.', 'Терапевт', 1),
('Др. Петрова О.М.', 'Хірург-імплантолог', 2);

-- ============================================================
-- 4. CASES (before/after)
-- ============================================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_uk TEXT,
    title_ru TEXT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    description_uk TEXT,
    description_ru TEXT,
    before_photo_url TEXT,
    after_photo_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. AI SETTINGS
-- ============================================================
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'openai',
    api_key TEXT,
    model TEXT DEFAULT 'gpt-4o-mini',
    system_prompt TEXT,
    custom_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO ai_settings (provider, model, system_prompt) VALUES
('openai', 'gpt-4o-mini', 'Ти — старший координатор клініки Dental Studio в Чернігові. Твоя мета — привітно та професійно допомагати пацієнтам: відповідати на запитання про послуги та ціни, пропонувати зручний час для запису, та плавно переводити розмову до запису на прийом. Ніколи не вигадуй інформацію — відповідай тільки на основі наданої бази знань. Якщо не знаєш відповіді — запропонуй залишити контакт для зв''язку адміністратора.');

-- ============================================================
-- 6. CHAT LOGS
-- ============================================================
CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    intent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);
CREATE INDEX idx_chat_logs_created ON chat_logs(created_at DESC);

-- ============================================================
-- 7. KNOWLEDGE BASE CHUNKS (for RAG)
-- ============================================================
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_embedding ON knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Allow public read for site content, prices, doctors, cases
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Public read price_list" ON price_list FOR SELECT USING (true);
CREATE POLICY "Public read doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Public read cases" ON cases FOR SELECT USING (true);

-- Authenticated write policies
CREATE POLICY "Auth write site_content" ON site_content FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write price_list" ON price_list FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write doctors" ON doctors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write cases" ON cases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write ai_settings" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');

-- Chat logs: anyone can insert, only auth can read
CREATE POLICY "Public insert chat_logs" ON chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth read chat_logs" ON chat_logs FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 9. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic-media', 'clinic-media', true);

CREATE POLICY "Public read clinic-media" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-media');
CREATE POLICY "Auth upload clinic-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clinic-media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update clinic-media" ON storage.objects FOR UPDATE USING (bucket_id = 'clinic-media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete clinic-media" ON storage.objects FOR DELETE USING (bucket_id = 'clinic-media' AND auth.role() = 'authenticated');

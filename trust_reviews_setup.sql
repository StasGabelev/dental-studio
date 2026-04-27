-- ============================================================
-- Dental Studio: Trust Counters + Reviews tables
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Trust Counters
CREATE TABLE IF NOT EXISTS trust_counters (
    id          serial PRIMARY KEY,
    sort_order  int     DEFAULT 0,
    value       int     NOT NULL DEFAULT 0,
    suffix      text    DEFAULT '',
    label_uk    text    NOT NULL DEFAULT '',
    is_active   boolean DEFAULT true
);

INSERT INTO trust_counters (sort_order, value, suffix, label_uk) VALUES
(1, 500, '+', 'задоволених пацієнтів'),
(2, 7,   '',  'років досвіду'),
(3, 98,  '%', 'рекомендують нас друзям'),
(4, 12,  '',  'лікарів у команді')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE trust_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read trust_counters"  ON trust_counters FOR SELECT USING (true);
CREATE POLICY "auth update trust_counters"  ON trust_counters FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert trust_counters"  ON trust_counters FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth delete trust_counters"  ON trust_counters FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id           serial PRIMARY KEY,
    sort_order   int     DEFAULT 0,
    author_name  text    NOT NULL DEFAULT '',
    author_initial text  DEFAULT '',
    avatar_url   text    DEFAULT '',
    review_text  text    NOT NULL DEFAULT '',
    stars        int     DEFAULT 5 CHECK (stars >= 1 AND stars <= 5),
    review_date  text    DEFAULT '',
    is_active    boolean DEFAULT true,
    created_at   timestamptz DEFAULT now()
);

INSERT INTO reviews (sort_order, author_name, author_initial, review_text, stars, review_date) VALUES
(1, 'Олена Д.', 'О', 'Нарешті знайшла клініку, де не боюся зубного! Зробила вінири — результат перевершив усі очікування. Дякую всій команді!', 5, 'Березень 2024'),
(2, 'Максим К.', 'М', 'Поставили імплант під ключ. Весь процес пройшов безболісно, а лікар пояснював кожен крок. Рекомендую всім!', 5, 'Лютий 2024'),
(3, 'Аліна С.', 'А', 'Відбілювання зробили за одне відвідування. Зуби стали на 8 тонів світліші. Персонал дуже уважний і професійний.', 5, 'Січень 2024')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reviews"  ON reviews FOR SELECT USING (is_active = true);
CREATE POLICY "auth all reviews"     ON reviews FOR ALL  USING (auth.role() = 'authenticated');

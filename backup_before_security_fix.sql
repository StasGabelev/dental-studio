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


-- ============================================================
-- AUTO-GENERATED INITIAL RECORD EXPORT FOR SITE CONTENT
-- ============================================================
INSERT INTO site_content (page_slug, section_key, content_type, value_uk) VALUES
('home', 'hero-video', 'video', 'https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4' ),
('home', 'interior-video', 'video', 'assets/custom_hero.mp4' ),
('home', 'hero-title', 'text', 'ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍' ),
('home', 'hero-subtitle', 'text', 'Від ідеальної гігієни до імплантів ''під ключ''. Онлайн-запис за посиланням ⬇️' ),
('home', 'btn-book', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('home', 'feat-aesthetic', 'text', 'Естетична стоматологія' ),
('home', 'feat-therapy', 'text', 'Лікування зубів' ),
('home', 'feat-surgery', 'text', 'Хірургія' ),
('home', 'feat-ortho', 'text', 'Ортодонтія' ),
('home', 'about-p1', 'text', 'Dental Studio — це стоматологічна клініка в Чернігові, що об’єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.' ),
('home', 'about-p2', 'text', 'Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматологіії.' ),
('home', 'about-more', 'text', 'ДІЗНАТИСЯ БІЛЬШЕ' ),
('home', 'about-services', 'text', 'ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ' ),
('home', 'works-title', 'text', 'НАШІ РОБОТИ' ),
('home', 'works-btn', 'text', 'ПЕРЕГЛЯНУТИ УСІ РОБОТИ' ),
('home', 'form-title', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('home', 'form-subtitle', 'text', 'Залиште заявку і администратор зв’яжеться з Вами, або зателефонуйте нам особисто' ),
('home', 'form-phone-label', 'text', 'Зв’язатися з нами для консультації:' ),
('home', 'form-name-placeholder', 'text', 'Прізвище та ім''я' ),
('home', 'form-comment-placeholder', 'text', 'Коментар' ),
('home', 'form-phone-placeholder', 'text', 'Номер телефону' ),
('home', 'form-privacy', 'text', 'Погоджуюся на обробку персональних данных та з умовами політики конфіденційності' ),
('home', 'form-btn', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('about', 'about-page-title', 'text', 'Про клініку — Dental Studio' ),
('about', 'about-section-tag', 'text', 'ПРО КЛІНІКУ' ),
('about', 'hero-title', 'text', 'Ми доповнюємо вашу красу' ),
('about', 'about-p1', 'text', 'Dental Studio — це стоматологічна клініка в Чернігові, що об’єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.' ),
('about', 'nav-works', 'text', 'НАШІ РОБОТИ' ),
('about', 'nav-services', 'text', 'ПОСЛУГИ' ),
('about', 'about-team-title', 'text', 'НАША КОМАНДА' ),
('about', 'team-savchuk-name', 'text', 'АНДРІЙ САВЧУК' ),
('about', 'team-savchuk-role', 'text', 'Заступник головного лікаря. Художня реставрація зубів.' ),
('about', 'team-anatoliy-name', 'text', 'АНАТОЛІЙ ТОКАР' ),
('about', 'team-anatoliy-role', 'text', 'Засновник, головний лікар. Стоматолог-ортопед/хірург.' ),
('about', 'team-mariya-name', 'text', 'МАРІЯ ТОКАР' ),
('about', 'team-mariya-role', 'text', 'Стоматолог-терапевт. Естетична реставрація.' ),
('services', 'feat-aesthetic', 'text', 'Естетична стоматологія' ),
('services', 'btn-book', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('services', 'feat-therapy', 'text', 'Лікування зубів' ),
('services', 'feat-surgery', 'text', 'Хірургія' ),
('services', 'feat-ortho', 'text', 'Ортодонтія' ),
('services', 'svc-consult-title', 'text', 'Консультація' ),
('services', 'svc-consult-desc', 'text', 'Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає
                                        зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу
                                        роботи.' ),
('services', 'price-consult-general', 'text', 'Загальна консультація' ),
('services', 'btn-book-short', 'text', 'Записатися' ),
('services', 'price-consult-modjaw', 'text', 'Функціональна діагностика MODJAW' ),
('services', 'price-consult-checkup', 'text', 'Стоматологічний CHECK-UP' ),
('services', 'svc-composite-veneer-title', 'text', 'Композитні вініри та реставрації' ),
('services', 'svc-composite-veneer-desc', 'text', 'Високоестетичне покращення та відтворення природньої форми та рельєфу зубів
                                        композитним матеріалом без препарування власних тканин зуба із терміном служби 5
                                        років.' ),
('services', 'price-frontal-restoration', 'text', 'Реставрація фронтального зуба' ),
('services', 'price-art-restoration', 'text', 'Художня реставрація - по ключу' ),
('services', 'svc-ceramic-restoration-title', 'text', 'Керамічні реставрації (вініри, коронки,
                                        накладки)' ),
('services', 'svc-ceramic-restoration-desc', 'text', 'Відтворення природності, рельєфу та структури зуба керамічними вінірами, зміна
                                        кольору посмішки на більш яскравішу, відновлення функції зубного ряду із
                                        терміном служби 15 років.' ),
('services', 'price-veneer-digital', 'text', 'Керамічний вінір (digital)' ),
('services', 'price-veneer-layering', 'text', 'Керамічний вінір (digital + нашарування)' ),
('services', 'price-veneer-handmade', 'text', 'Керамічний вінір (hand made, полевошпат)' ),
('services', 'price-veneer-rework', 'text', 'Переробка керамічного вініра чужої роботи (за зуб)' ),
('services', 'price-veneer-single', 'text', 'Керамічний вінір - одиночний центральний різець' ),
('services', 'price-crown-digital', 'text', 'Керамічна коронка на імплантаті (digital)' ),
('services', 'price-crown-layering', 'text', 'Керамічна коронка на імплантаті (digital +
                                            нашарування)' ),
('services', 'price-crown-handmade', 'text', 'Керамічна коронка на імплантаті (hand made,
                                            полевошпат)' ),
('services', 'svc-endo-title', 'text', 'Ендодонтія' ),
('services', 'svc-endo-desc', 'text', 'Ювелірна робота вузького спеціаліста по збереженню зуба. Первинне та вторинне лікування кореневих каналів, вилучення уламків інструментів та лікування запальних процесів на верхівці кореня зуба із використанням мікроскопа.' ),
('services', 'price-endo-incisor', 'text', 'Лікування кореневих каналів (різці, ікла)' ),
('services', 'price-endo-premolar', 'text', 'Лікування кореневих каналів (премоляри)' ),
('services', 'price-endo-molar', 'text', 'Лікування кореневих каналів (моляри)' ),
('services', 'svc-caries-title', 'text', 'Лікування карієсу' ),
('services', 'svc-caries-desc', 'text', 'Видалення уражених тканин зуба із подальшим відновленням його природньої форми та морфології композитним матеріалом за сучасними протоколами із використанням операційного мікроскопу.' ),
('services', 'price-caries-2', 'text', 'Лікування карієсу - ІI рівень складності' ),
('services', 'price-caries-3', 'text', 'Лікування карієсу - ІII рівень складності' ),
('services', 'svc-periodontal-title', 'text', 'Пародонтологічне лікування' ),
('services', 'svc-periodontal-desc', 'text', 'Зняття надясенних та підясенних зубних відкладень. Очищення кореня від зубного каменю із використанням ручних інструментів Hu-Friedy. Антисептична обробка пародонтальних кишень. Заповнення пародонтологічної карти. Урок гігієни.' ),
('services', 'price-periodont-1', 'text', 'Лікування пародонтиту - І ступінь' ),
('services', 'price-periodont-2', 'text', 'Лікування пародонтиту - ІІ ступінь' ),
('services', 'price-periodont-3', 'text', 'Лікування пародонтиту - ІІI ступінь' ),
('services', 'svc-hygiene-title', 'text', 'Професійна гігієна зубів' ),
('services', 'svc-hygiene-desc', 'text', 'Контроль гігієни ротової порожнини. Зняття твердих зубних відкладень за допомогою ультразвукового скейлера та ручних інструментів. Зняття м’якого зубного нальоту повітряно-абразивною обробкою Prophyflex.' ),
('services', 'price-hygiene', 'text', 'Професійна гігієна' ),
('services', 'price-hygiene-smoker', 'text', 'Професійна гігієна (наліт курця)' ),
('services', 'svc-whitening-title', 'text', 'Відбілювання зубів' ),
('services', 'svc-whitening-desc', 'text', 'Безпечна та високоефективна процедура клінічного відбілювання системою Beyond за допомогою гелю та спеціального лазерного світла для досягнення білішого та здоровішого вигляду зубів.' ),
('services', 'price-whitening', 'text', 'Відбілювання' ),
('services', 'svc-implant-title', 'text', 'Імплантація' ),
('services', 'svc-implant-desc', 'text', 'Імплантація відсутніх зубів із використанням швейцарських імплантатів Straumann та спеціальних хірургічних шаблонів, які виготовляються для кожного пацієнта індивідуально.' ),
('services', 'price-implant-neodent', 'text', 'Імплант NEODENT (Бразилія)' ),
('services', 'price-implant-sla', 'text', 'Імплант STRAUMANN SLA (Швейцарія)' ),
('services', 'price-implant-slactive', 'text', 'Імплант STRAUMANN SLACTIVE (Швейцарія)' ),
('services', 'price-crown-monolit', 'text', 'Коронка на імпланті (monolit)' ),
('services', 'price-crown-aesthetic', 'text', 'Коронка на імпланті (платформа + абатмент + керамічний вінір)' ),
('services', 'svc-extraction-title', 'text', 'Видалення зубів' ),
('services', 'svc-extraction-desc', 'text', 'Майстерне видалення зубів під місцевою анастезією або в медикаментозному сні (седація). Седація – це занурення пацієнта в глибокий або поверхневий природний сон под контролем лікаря-анастезіолога.' ),
('services', 'price-extraction', 'text', 'Видалення зуба' ),
('services', 'price-extraction-atypical-1', 'text', 'Атипове видалення (просте)' ),
('services', 'price-extraction-atypical-2', 'text', 'Атипове видалення (складне)' ),
('services', 'price-sedation', 'text', 'Медикаментозний сон (седація) - 1 година' ),
('services', 'svc-gum-surgery-title', 'text', 'Закриття рецесій, хірургічне подовження клінічної коронки зуба, усунення ясеневої посмішки' ),
('services', 'svc-gum-surgery-desc', 'text', 'Високоестетичні хірургічні операції із яснами (корекція ясен) для створення нової естетики посмішки пацієнта в комбінації із керамічними вінірами.' ),
('services', 'price-gum-smile', 'text', 'Операція усунення ясенної посмішки (10 зубів)' ),
('services', 'price-recession', 'text', 'Закриття рецесій біля одного зуба' ),
('services', 'price-gum-extension', 'text', 'Видовження ясен біля одного зуба' ),
('services', 'svc-braces-title', 'text', 'Лікування брекет-системою' ),
('services', 'svc-braces-desc', 'text', 'Повернення пацієнту не лише краси та естетики посмішки, а й відновлення правильного функціонування зубо-щелепної системи за допомогою лікування брекет системою.' ),
('services', 'price-braces-metal', 'text', 'Лікування брекет-системою (метал)' ),
('services', 'price-braces-ceramic', 'text', 'Лікування брекет-системою (кераміка)' ),
('services', 'price-braces-self-metal', 'text', 'Лікування брекет-системою (самолігуючі, метал)' ),
('services', 'price-ortho-visit', 'text', 'Щомісячний контрольний візит до ортодонта' ),
('services', 'price-braces-self-ceramic', 'text', 'Лікування брекет-системою (самолігуючі, кераміка)' ),
('services', 'svc-aligners-title', 'text', 'Лікування елайнерами' ),
('services', 'svc-aligners-desc', 'text', 'Повернення пацієнту не лише краси та естетики посмішки, а й відновлення правильного функціонування зубо-щелепної системи за допомогою лікування елайнерами. Елайнери - індивідуальний комплект прозорих кап, які непомітно для оточуючих вирівнюють зуби.' ),
('services', 'price-aligners', 'text', 'Лікування елайнерами' ),
('services', 'form-name-placeholder', 'text', 'Прізвище та ім''я' ),
('services', 'form-comment-placeholder', 'text', 'Коментар' ),
('services', 'form-phone-placeholder', 'text', 'Номер телефону' ),
('services', 'form-privacy', 'text', 'Погоджуюся на обробку персональних даних та з умовами політики конфіденційності' ),
('services', 'form-btn', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('cases', 'cases-page-title', 'text', 'Наші роботи — Dental Studio' ),
('cases', 'cases-hero-title', 'text', 'НАШІ РОБОТИ' ),
('cases', 'filter-all', 'text', 'Всі роботи' ),
('cases', 'filter-veneers', 'text', 'Керамічні вініри' ),
('cases', 'filter-composite', 'text', 'Композитні вініри' ),
('cases', 'filter-restoration', 'text', 'Композитні реставрації' ),
('cases', 'filter-implants', 'text', 'Імплантація' ),
('cases', 'filter-ortho', 'text', 'Ортодонтія' ),
('cases', 'filter-whitening', 'text', 'Відбілювання зубів' ),
('contact', 'contacts-page-title', 'text', 'Контакти — Dental Studio' ),
('contact', 'form-title', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('contact', 'form-subtitle', 'text', 'Залишіть заявку й адміністратор зв''яжеться з Вами, або зателефонуйте нам особисто' ),
('contact', 'form-phone-label', 'text', 'Зв''язатися з нами для консультації:' ),
('contact', 'form-name-placeholder', 'text', 'Прізвище та ім''я' ),
('contact', 'form-comment-placeholder', 'text', 'Коментар' ),
('contact', 'form-phone-placeholder', 'text', 'Номер телефону' ),
('contact', 'form-privacy', 'text', 'Погоджуюся на обробку персональних даних та з умовами політики конфіденційності' ),
('contact', 'form-btn', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' ),
('contact', 'footer-find-us', 'text', 'ДЕ НАС ЗНАЙТИ' ),
('contact', 'map-address', 'text', 'ВУЛИЦЯ НЕЗАЛЕЖНОСТІ, 21, ЧЕРНІГІВ, УКРАЇНА' ),
('contact', 'footer-map-btn', 'text', 'ЗНАЙТИ НАС НА КАРТІ' ),
('contact', 'footer-hours-title', 'text', 'ГРАФІК РОБОТИ' ),
('contact', 'footer-hours-days', 'text', 'ПН — ПТ, 10:00 — 18:00' ),
('footer', 'footer-find-us', 'text', 'ДЕ НАС ЗНАЙТИ' ),
('footer', 'footer-location', 'text', 'Київ, Україна' ),
('footer', 'footer-address-street', 'text', 'Проспект Берестейський, 5В' ),
('footer', 'footer-map-btn', 'text', 'ЗНАЙТИ НАС НА КАРТІ' ),
('footer', 'footer-tagline', 'text', 'ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍' ),
('footer', 'footer-hours-title', 'text', 'ГРАФІК РОБОТИ' ),
('footer', 'footer-hours-days', 'text', 'Пн — Пт, 10:00 — 18:00' ),
('footer', 'footer-copyright', 'text', 'Copyright © 2026. Dental Studio. Всі права захищені.' ),
('footer', 'btn-book', 'text', 'ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ' )
ON CONFLICT (page_slug, section_key) DO UPDATE SET value_uk = EXCLUDED.value_uk;

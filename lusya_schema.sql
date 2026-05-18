-- ============================================================
-- Lusya Schema Migration
-- Dental Studio (rozetka.space)
-- Safe to run multiple times (idempotent)
-- Run this file ONCE in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 0. Base tables (from cliniccards_hub_setup.sql — safe if already exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    gender TEXT,
    dob DATE,
    profession TEXT,
    note TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cc_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id TEXT UNIQUE,
    patient_id UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    doctor_id TEXT,
    visit_date DATE,
    time_start TIME,
    time_end TIME,
    status TEXT,
    note TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cc_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    dob DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cc_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    query_logic JSONB,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_run_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT,
    source_platform TEXT,
    client_name TEXT,
    description TEXT,
    payload JSONB,
    metadata JSONB,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for base tables
CREATE INDEX IF NOT EXISTS idx_cc_patients_phone ON cc_patients(phone);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);


-- ============================================================
-- 1. Extend cc_patients with Lusya-specific columns
-- ============================================================

ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS viber_id TEXT;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS wa_phone TEXT;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS preferred_channel TEXT;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT FALSE;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS children_ages JSONB;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS profession_verified TEXT;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS custom_tags TEXT[];
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
ALTER TABLE cc_patients ADD COLUMN IF NOT EXISTS notes_lusya TEXT;


-- ============================================================
-- 2. Extend cc_visits with service and payment columns
-- ============================================================

ALTER TABLE cc_visits ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE cc_visits ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE cc_visits ADD COLUMN IF NOT EXISTS doctor_cc_id TEXT;


-- ============================================================
-- 3. Create table: cc_doctors
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_doctors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    specialization  TEXT,
    photo_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    schedule_json   JSONB,          -- raw schedule from CRM
    last_sync_at    TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 4. Create table: cc_services
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id         TEXT UNIQUE NOT NULL,
    name          TEXT,
    category      TEXT,
    price_min     NUMERIC(10,2),
    price_max     NUMERIC(10,2),
    duration_min  INT,             -- duration in minutes
    is_active     BOOLEAN DEFAULT TRUE,
    last_sync_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 5. Create table: campaigns
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    message_template TEXT NOT NULL,
    audience_filter  JSONB DEFAULT '{}',
    channel_priority TEXT[] DEFAULT ARRAY['telegram','whatsapp','viber'],
    scheduled_at     TIMESTAMPTZ,
    status           TEXT DEFAULT 'draft',   -- draft|scheduled|running|done|cancelled
    created_by       TEXT DEFAULT 'lusya',
    stats            JSONB DEFAULT '{"sent":0,"delivered":0,"failed":0}',
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 6. Create table: campaign_deliveries
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_deliveries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    patient_id   UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    channel      TEXT,            -- telegram|whatsapp|viber
    status       TEXT DEFAULT 'pending',   -- pending|sent|delivered|failed
    sent_at      TIMESTAMPTZ,
    error        TEXT
);


-- ============================================================
-- 7. Create table: surveys
-- ============================================================

CREATE TABLE IF NOT EXISTS surveys (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    questions            JSONB NOT NULL,    -- [{id: 'q1', text: '...', type: 'choice'|'text'|'rating', options: [...], extract_field: 'has_children'}]
    audience_filter      JSONB DEFAULT '{}',
    trigger_type         TEXT DEFAULT 'manual',  -- manual|post_visit|scheduled
    trigger_delay_hours  INT DEFAULT 3,           -- for post_visit triggers
    scheduled_at         TIMESTAMPTZ,
    status               TEXT DEFAULT 'draft',
    created_by           TEXT DEFAULT 'lusya',
    created_at           TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 8. Create table: survey_responses
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_responses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id     UUID REFERENCES surveys(id) ON DELETE CASCADE,
    patient_id    UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    channel       TEXT,
    responses     JSONB,   -- {q1: 'ответ', q2: 'вариант2'}
    ai_extracted  JSONB,   -- {has_children: true, children_ages: [{age: 5}]}
    processed     BOOLEAN DEFAULT FALSE,
    responded_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 9. Create table: automated_flows
-- ============================================================

CREATE TABLE IF NOT EXISTS automated_flows (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    trigger_type     TEXT NOT NULL,   -- post_visit|birthday|no_visit_90days
    delay_hours      INT DEFAULT 3,
    message_template TEXT,
    survey_id        UUID REFERENCES surveys(id),
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 10. Create table: flow_executions
-- ============================================================

CREATE TABLE IF NOT EXISTS flow_executions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id      UUID REFERENCES automated_flows(id) ON DELETE CASCADE,
    patient_id   UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    visit_cc_id  TEXT,            -- for post_visit flows
    triggered_at TIMESTAMPTZ DEFAULT now(),
    executed_at  TIMESTAMPTZ,
    status       TEXT DEFAULT 'pending',  -- pending|sent|failed|skipped
    channel      TEXT,
    result       JSONB
);


-- ============================================================
-- 11. Create table: lusya_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS lusya_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id TEXT UNIQUE NOT NULL,
    messages         JSONB DEFAULT '[]',   -- conversation history
    last_active      TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 12. Extend ai_settings with Lusya bot columns
-- ============================================================

ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_bot_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_openrouter_key TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_system_prompt TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_simple_model TEXT DEFAULT 'google/gemini-flash-1.5';
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_complex_model TEXT DEFAULT 'anthropic/claude-sonnet-4-6';
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS lusya_simple_keywords TEXT DEFAULT 'сколько,кто,список,покажи,когда,сколько,скільки,хто,список,покажи,коли';
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS booking_rules JSONB DEFAULT '{"auto_book":["консультация","осмотр","профессиональная чистка"],"require_approval":["имплантация","протезирование","хирургия","ортодонтия"]}';


-- ============================================================
-- 13. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cc_patients_telegram_id
    ON cc_patients(telegram_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
    ON campaigns(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign
    ON campaign_deliveries(campaign_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey
    ON survey_responses(survey_id, processed);

CREATE INDEX IF NOT EXISTS idx_flow_executions_patient
    ON flow_executions(patient_id, flow_id);

CREATE INDEX IF NOT EXISTS idx_cc_visits_patient
    ON cc_visits(patient_id, visit_date);


-- ============================================================
-- 14. Default automated flows (all inactive until configured)
-- ============================================================

INSERT INTO automated_flows (name, trigger_type, delay_hours, message_template, is_active)
SELECT
    'Post-visit survey',
    'post_visit',
    3,
    NULL,   -- set after surveys are created
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM automated_flows WHERE trigger_type = 'post_visit'
);

INSERT INTO automated_flows (name, trigger_type, delay_hours, message_template, is_active)
SELECT
    'Birthday greeting',
    'birthday',
    0,
    NULL,
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM automated_flows WHERE trigger_type = 'birthday'
);

INSERT INTO automated_flows (name, trigger_type, delay_hours, message_template, is_active)
SELECT
    'Re-activation (90 days no visit)',
    'no_visit_90days',
    0,
    NULL,
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM automated_flows WHERE trigger_type = 'no_visit_90days'
);

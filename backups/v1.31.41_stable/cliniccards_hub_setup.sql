-- 🏥 AI Hub & Cliniccards Integration Schema
-- This file contains the necessary tables to support the Admin AI Assistant
-- and the synchronization with Cliniccards CRM.

-- 1. Sync Tables (Mirrors of CRM data)
CREATE TABLE IF NOT EXISTS cc_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id TEXT UNIQUE, -- ID from Cliniccards
    full_name TEXT,
    phone TEXT,
    email TEXT,
    gender TEXT,
    dob DATE,
    profession TEXT, -- Extended info
    note TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cc_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cc_id TEXT UNIQUE,
    patient_id UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    doctor_id TEXT, -- Can link to doctors table later
    visit_date DATE,
    time_start TIME,
    time_end TIME,
    status TEXT, -- PLANNED, VISITED, etc.
    note TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Family & Relationships (Extended Data)
CREATE TABLE IF NOT EXISTS cc_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES cc_patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    dob DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Segmentation & Groups
CREATE TABLE IF NOT EXISTS cc_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    query_logic JSONB, -- Stores the SQL or filter logic
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_run_at TIMESTAMPTZ
);

-- 4. Admin Task Service (Handover from Support Bot)
CREATE TABLE IF NOT EXISTS admin_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'booking_request', 'info_update', 'alert'
    source_platform TEXT, -- 'telegram', 'viber', 'web'
    source_session_id UUID REFERENCES chat_sessions(id),
    client_name TEXT,
    description TEXT,
    payload JSONB, -- Full message or data extracted by AI
    status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'completed', 'archived'
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cc_patients_phone ON cc_patients(phone);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);

-- 5. Add Cliniccards API Token to settings (if not there)
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS cc_api_token TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS cc_clinic_id TEXT;

COMMENT ON TABLE admin_tasks IS 'Queue for the Admin AI to process requests from the patient-facing Support Bot';

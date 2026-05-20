-- Create messenger_users table if not exists
CREATE TABLE IF NOT EXISTS messenger_users (
    id            SERIAL PRIMARY KEY,
    platform      TEXT NOT NULL,
    platform_user_id TEXT NOT NULL,
    session_id    UUID REFERENCES chat_sessions(id),
    patient_phone TEXT,
    patient_cc_id TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, platform_user_id)
);

-- Add columns if table already exists (safe to run either way)
ALTER TABLE messenger_users ADD COLUMN IF NOT EXISTS patient_phone TEXT;
ALTER TABLE messenger_users ADD COLUMN IF NOT EXISTS patient_cc_id TEXT;

-- View: how many bot subscribers per platform
SELECT
    platform,
    COUNT(*) AS subscribers
FROM messenger_users
GROUP BY platform
ORDER BY subscribers DESC;

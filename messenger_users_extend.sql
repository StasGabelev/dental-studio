ALTER TABLE messenger_users ADD COLUMN IF NOT EXISTS patient_phone TEXT;
ALTER TABLE messenger_users ADD COLUMN IF NOT EXISTS patient_cc_id TEXT;

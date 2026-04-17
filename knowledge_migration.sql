-- Add Knowledge Base Manual field to AI settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS knowledge_base_manual TEXT;

-- Recommended: Add a comment to the column for clarity
COMMENT ON COLUMN ai_settings.knowledge_base_manual IS 'Clinic business rules, policies and manual for the AI to follow.';

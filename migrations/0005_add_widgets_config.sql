
-- Add config column to widgets table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'widgets' AND column_name = 'config'
    ) THEN
        ALTER TABLE widgets ADD COLUMN config TEXT DEFAULT '{}';
    END IF;
END $$;

-- Update existing widgets to have default config
UPDATE widgets SET config = '{}' WHERE config IS NULL;

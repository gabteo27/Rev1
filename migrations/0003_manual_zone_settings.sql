
-- Manual migration to add zone_settings if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playlists' AND column_name = 'zone_settings'
    ) THEN
        ALTER TABLE "playlists" ADD COLUMN "zone_settings" jsonb;
    END IF;
END $$;

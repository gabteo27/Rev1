
-- Add custom_layout_config column to playlists table
ALTER TABLE "playlists" ADD COLUMN "custom_layout_config" jsonb;

-- Update layout_type enum to include new types
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'grid_2x2';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'grid_3x3';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'sidebar_left';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'sidebar_right';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'header_footer';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'triple_vertical';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'triple_horizontal';
ALTER TYPE "layout_type" ADD VALUE IF NOT EXISTS 'custom_layout';

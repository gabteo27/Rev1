
-- Add custom_layout_config column to playlists table
ALTER TABLE "playlists" ADD COLUMN "custom_layout_config" jsonb;

-- Update layout_type enum to include new types
ALTER TYPE "layout_type" ADD VALUE 'grid_2x2';
ALTER TYPE "layout_type" ADD VALUE 'grid_3x3';
ALTER TYPE "layout_type" ADD VALUE 'sidebar_left';
ALTER TYPE "layout_type" ADD VALUE 'sidebar_right';
ALTER TYPE "layout_type" ADD VALUE 'header_footer';
ALTER TYPE "layout_type" ADD VALUE 'triple_vertical';
ALTER TYPE "layout_type" ADD VALUE 'triple_horizontal';
ALTER TYPE "layout_type" ADD VALUE 'custom_layout';

-- Fix About Us images storage
-- Instead of using a separate content_images table, we'll use the site_assets storage bucket
-- and store the full URLs directly in the content_blocks table as JSON metadata

-- Add image_url column to content_blocks for storing image URLs
ALTER TABLE content_blocks 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add metadata column for storing additional data like alt text
ALTER TABLE content_blocks 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_content_blocks_metadata ON content_blocks USING GIN (metadata);

-- Update existing content blocks with image URLs if needed
UPDATE content_blocks 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

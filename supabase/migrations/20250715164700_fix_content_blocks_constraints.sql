-- Fix content_blocks table constraints
-- First, check if the constraint exists and drop it if it does
ALTER TABLE content_blocks 
DROP CONSTRAINT IF EXISTS content_blocks_unique_key_slug;

-- Ensure the columns exist and have the correct types
ALTER TABLE content_blocks 
ALTER COLUMN block_key SET NOT NULL,
ALTER COLUMN page_slug SET NOT NULL;

-- Create the unique constraint on the combination of block_key and page_slug
ALTER TABLE content_blocks 
ADD CONSTRAINT content_blocks_unique_key_slug UNIQUE (block_key, page_slug);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_content_blocks_key_slug ON content_blocks(block_key, page_slug);

-- Ensure all existing rows have valid data
UPDATE content_blocks 
SET page_slug = COALESCE(page_slug, 'homepage'),
    block_key = COALESCE(block_key, 'default')
WHERE page_slug IS NULL OR block_key IS NULL;

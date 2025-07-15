-- Add unique constraint for content_blocks table
ALTER TABLE content_blocks 
ADD CONSTRAINT content_blocks_unique_key_slug UNIQUE (block_key, page_slug);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_content_blocks_key_slug ON content_blocks(block_key, page_slug);

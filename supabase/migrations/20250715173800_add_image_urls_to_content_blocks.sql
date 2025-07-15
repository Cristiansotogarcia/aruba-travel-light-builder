-- Add image URL columns to content_blocks table
ALTER TABLE content_blocks 
ADD COLUMN IF NOT EXISTS about_image_url TEXT;

ALTER TABLE content_blocks 
ADD COLUMN IF NOT EXISTS additional_image_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_blocks_image_urls ON content_blocks(about_image_url, additional_image_url);

-- Update existing records to have NULL image URLs
UPDATE content_blocks 
SET about_image_url = NULL, additional_image_url = NULL 
WHERE about_image_url IS NULL AND additional_image_url IS NULL;

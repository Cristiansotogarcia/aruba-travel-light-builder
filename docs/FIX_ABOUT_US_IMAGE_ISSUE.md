# Fix About Us Image Upload Issue

## Problem Description
When uploading images through Cloudflare in the About Us management section, users encounter a 406 (Not Acceptable) error:
```
GET https://abofxrgdxfzrhjbvhdkj.supabase.co/rest/v1/content_blocks?select=title%2Ccontent&block_key=eq.about_us_full&page_slug=eq.about-us 406 (Not Acceptable)
```

## Root Cause
The issue was caused by the AboutUsManagement component trying to query a non-existent `content_images` table and using an incorrect data structure for storing images. The component was attempting to:

1. Query `content_images` table which doesn't exist
2. Use file paths instead of direct URLs like the equipment system
3. Missing database columns for storing image URLs

## Solution Implemented

### 1. Database Schema Updates
Created `supabase/migrations/20250715170900_fix_about_us_images.sql` which:
- Added `image_url` column to `content_blocks` table for direct image URL storage
- Added `metadata` JSONB column for storing additional image data
- Created appropriate indexes for performance
- Ensures data integrity

### 2. Updated Data Structure
Changed from using a separate `content_images` table to storing images directly in the `content_blocks` table, following the same pattern used in the equipment system:

**Before:**
```typescript
// Separate table approach (problematic)
const { data: image } = await supabase
  .from('content_images')
  .select('file_path, alt_text')
  .eq('image_key', 'about_us_image')
  .single();
```

**After:**
```typescript
// Direct URL storage (working)
const { data: content } = await supabase
  .from('content_blocks')
  .select('title, content, image_url, metadata')
  .eq('block_key', 'about_us_full')
  .eq('page_slug', 'about-us')
  .single();
```

### 3. Updated Component Logic
Modified `AboutUsManagement.tsx` to:
- Use `image_url` column for main images
- Use `metadata` JSONB for additional images
- Follow the same pattern as equipment images (direct URL storage)
- Fixed TypeScript interfaces

### 4. Updated Seed Scripts
Updated both seed scripts to include the new columns:
- `scripts/seed-about-us-content.ts`
- `scripts/seed-about-us-content.js`

## Files Modified

### Database Migrations
- `supabase/migrations/20250715170900_fix_about_us_images.sql` - New schema changes

### Component Updates
- `src/components/admin/AboutUsManagement.tsx` - Fixed image handling logic

### Seed Scripts
- `scripts/seed-about-us-content.ts` - Updated with new columns
- `scripts/seed-about-us-content.js` - Updated with new columns

## How to Apply the Fix

### Step 1: Apply Database Migrations
```bash
# Apply the new migration
npx supabase db push

# Or for remote database
npx supabase db push --linked
```

### Step 2: Seed Initial Data (if needed)
```bash
# Ensure environment variables are set
cp .env.example .env
# Edit .env with your Supabase credentials

# Run seed script
npx tsx scripts/seed-about-us-content.ts
```

### Step 3: Test Image Upload
1. Go to Admin dashboard → About Us Management
2. Click "Upload Image" for either homepage or about page
3. Select an image through Cloudflare upload
4. Image should upload successfully and display immediately

## Technical Details

### Image Storage Pattern
Following the equipment system's pattern:
- **Direct URL storage**: Images are stored as full URLs in `image_url` column
- **Metadata support**: Additional images stored in JSONB `metadata` field
- **No file path conversion**: Eliminates complexity of file path to URL conversion

### Cloudflare Integration
- Uses existing `CloudflareImageUpload` component
- Images are uploaded to Cloudflare and URLs are stored directly
- No need for Supabase storage bucket management

### Error Resolution
The 406 error was resolved by:
1. Removing queries to non-existent `content_images` table
2. Using correct column names in queries
3. Following consistent data structure across the application

## Testing Checklist
- [ ] Database migration applies successfully
- [ ] About Us content loads without errors
- [ ] Image upload works for homepage section
- [ ] Image upload works for about page main image
- [ ] Image upload works for about page additional image
- [ ] Images display correctly after upload
- [ ] Content saves successfully with images
- [ ] No 406 or other HTTP errors in console

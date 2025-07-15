# Fix About Us Content Update Issue

## Problem Description
When updating the About Us page from the Admin dashboard, the following error occurs:
```
POST https://abofxrgdxfzrhjbvhdkj.supabase.co/rest/v1/content_blocks?on_conflict=block_key%2Cpage_slug 400 (Bad Request)
Error: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Root Cause
The `content_blocks` table is missing the required unique constraint on the combination of `block_key` and `page_slug` columns. The `ON CONFLICT (block_key,page_slug)` clause in the upsert operations requires this constraint to exist.

## Solution

### 1. Database Migration
A new migration file has been created: `20250715164700_fix_content_blocks_constraints.sql`

This migration:
- Drops any existing constraint with the same name
- Ensures the required columns are NOT NULL
- Creates the unique constraint on `(block_key, page_slug)`
- Creates an index for better performance
- Ensures data integrity for existing rows

### 2. Environment Variables
Updated the seed scripts to use the correct environment variable names:
- `VITE_PUBLIC_SUPABASE_URL` instead of `VITE_SUPABASE_URL`
- `VITE_PUBLIC_SUPABASE_ANON_KEY` instead of `VITE_SUPABASE_ANON_KEY`

### 3. Files Updated
- `supabase/migrations/20250715164700_fix_content_blocks_constraints.sql` - New migration
- `scripts/seed-about-us-content.ts` - Fixed environment variable names
- `scripts/seed-about-us-content.js` - Fixed environment variable names

## Steps to Apply the Fix

### Step 1: Apply the Database Migration
```bash
# Run the migration to apply the constraint
npx supabase db push

# Or if using remote database, ensure the migration is applied
npx supabase db push --linked
```

### Step 2: Seed Initial Data (Optional)
```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Edit .env with your actual Supabase credentials
# Then run the seed script
npx tsx scripts/seed-about-us-content.ts
```

### Step 3: Verify the Fix
1. Go to the Admin dashboard
2. Navigate to About Us Management
3. Try updating the homepage or about page content
4. The save operation should now succeed without errors

## Technical Details

### Constraint Details
The unique constraint ensures that each combination of `block_key` and `page_slug` is unique, which allows the `ON CONFLICT` clause to work correctly in upsert operations.

### Query Pattern
The current code uses:
```typescript
await supabase
  .from('content_blocks')
  .upsert({
    block_key: 'about_us_short',
    page_slug: 'homepage',
    // ... other fields
  }, {
    onConflict: 'block_key,page_slug'
  });
```

This pattern requires the unique constraint on `(block_key, page_slug)` to function properly.

## Troubleshooting

If the issue persists after applying the migration:

1. **Check if the constraint exists:**
   ```sql
   SELECT conname, condef 
   FROM pg_constraint 
   WHERE conrelid = 'content_blocks'::regclass;
   ```

2. **Verify table structure:**
   ```sql
   \d content_blocks
   ```

3. **Check for duplicate data:**
   ```sql
   SELECT block_key, page_slug, COUNT(*) 
   FROM content_blocks 
   GROUP BY block_key, page_slug 
   HAVING COUNT(*) > 1;
   ```

4. **Manual constraint creation:**
   If the migration doesn't apply, you can manually run:
   ```sql
   ALTER TABLE content_blocks 
   ADD CONSTRAINT content_blocks_unique_key_slug UNIQUE (block_key, page_slug);

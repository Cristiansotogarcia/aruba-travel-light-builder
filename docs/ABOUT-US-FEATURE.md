# About Us Feature Documentation

## Overview
The About Us feature provides a complete solution for managing company information across the website, including a homepage section and a dedicated about-us page with image upload capabilities.

## Features

### Homepage About Us Section
- **Location**: Displayed on the homepage after the "How It Works" section
- **Components**:
  - Rounded profile image (same upload system as equipment products)
  - Short description text
  - "Read Complete Story" button linking to `/about-us`

### About Us Page (`/about-us`)
- **Full company story** with rich text content
- **Main image** (same as homepage - shared across both locations)
- **Additional image** that can be inserted within the text content
- **Admin management** for all content and images

## Database Structure

### Content Blocks Table
Stores text content for different pages and sections.

```sql
-- Key records for about us:
-- block_key: 'about_us_short', page_slug: 'homepage'
-- block_key: 'about_us_full', page_slug: 'about-us'
```

### Content Images Table
Stores image references for site-wide assets.

```sql
-- Key records for about us:
-- image_key: 'about_us_image' (used on both homepage and about-us page)
-- image_key: 'about_us_additional_image' (additional image for about-us page)
```

## Admin Management

### Access Requirements
- **Admin role** required for content and image management
- Images can be uploaded/changed via the Cloudflare image upload system
- Content can be edited directly on the about-us page

### Management Interface
- **Edit Mode**: Toggle between view and edit modes
- **Image Upload**: Use the same Cloudflare image upload system as equipment products
- **Content Editor**: Rich text editing with title and description fields

## Usage Instructions

### Initial Setup
1. Run the seed script to populate initial content:
   ```bash
   npm run seed:about-us
   ```

2. Or run all seed scripts:
   ```bash
   npm run seed:all
   ```

### For Admins
1. Navigate to `/about-us`
2. Click "Edit" to enter edit mode
3. Update title and content as needed
4. Click images to change them using the upload dialog
5. Click "Save" to persist changes

### For Users
- Homepage: View the About Us section with image and short description
- About Us page: Click "Read Complete Story" from homepage or navigate directly to `/about-us`

## File Structure

```
src/
├── components/
│   └── homepage/
│       └── AboutUsSection.tsx     # Homepage about us section
├── pages/
│   ├── Index.tsx                  # Homepage with AboutUsSection
│   └── About.tsx                  # Full about-us page
scripts/
├── seed-about-us-content.ts       # TypeScript seed script
└── seed-about-us-content.js       # JavaScript seed script
```

## Technical Details

### Image Upload System
- Uses the same Cloudflare Images integration as equipment products
- Images are stored in Supabase storage under the 'site-assets' bucket
- Automatic file path generation: `{image_key}/{filename}`

### Data Fetching
- Uses React Query for efficient data fetching and caching
- Automatic refetching after content/image updates
- Loading states with skeleton placeholders

### Responsive Design
- Mobile-first responsive layout
- Grid layouts that adapt to screen size
- Optimized image display with proper aspect ratios

## Customization

### Styling
- Uses Tailwind CSS for consistent styling
- Easy to customize colors, spacing, and typography
- Follows the existing design system

### Content
- All text content is editable via the admin interface
- Images can be replaced without code changes
- Additional images can be added as needed

## Troubleshooting

### Common Issues

1. **Images not displaying**
   - Check that the seed script has been run
   - Verify Cloudflare Images configuration
   - Check Supabase storage bucket permissions

2. **Content not updating**
   - Ensure admin role is assigned to user
   - Check browser console for errors
   - Verify database connection

3. **Routes not working**
   - Ensure `/about-us` route is properly configured in App.tsx
   - Check that the About component is properly imported

## Future Enhancements

- Multiple image gallery support
- Rich text editor with formatting options
- SEO meta tags management
- Multi-language support
- Version history for content changes

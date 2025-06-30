# Cloudflare Images Integration Setup

This guide explains how to set up and use the Cloudflare Images integration in your booking management application.

## Prerequisites

1. A Cloudflare account with Images enabled
2. Images uploaded to your Cloudflare Images library
3. API token with appropriate permissions

## Setup Instructions

### 1. Get Your Cloudflare Credentials

1. **Account ID**: 
   - Log into your Cloudflare dashboard
   - Copy your Account ID from the right sidebar

2. **API Token**:
   - Go to "My Profile" → "API Tokens"
   - Click "Create Token"
   - Use the "Custom token" template
   - Set permissions:
     - Account: `Cloudflare Images:Read`
     - Zone Resources: `Include All zones` (or specific zones)
   - Copy the generated token

### 2. Configure Environment Variables

1. Copy your `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Cloudflare credentials to `.env`:
   ```env
   VITE_CLOUDFLARE_ACCOUNT_ID=your-actual-account-id
   VITE_CLOUDFLARE_API_TOKEN=your-actual-api-token
   # Edge function variables (can reuse the above values)
   CLOUDFLARE_ACCOUNT_ID=$VITE_CLOUDFLARE_ACCOUNT_ID
   CLOUDFLARE_API_TOKEN=$VITE_CLOUDFLARE_API_TOKEN
   ```

### 3. Upload Images to Cloudflare

Before using the integration, make sure you have images in your Cloudflare Images library:

1. Go to your Cloudflare dashboard
2. Navigate to "Images"
3. Upload your product images
4. Note: The integration will display these images for selection

## Using the Integration

### In Product Management

1. **Creating a New Product**:
   - Click "Add Product"
   - In the Image section, you'll see two tabs:
     - **File Upload**: Traditional file upload to Supabase
     - **Cloudflare Images**: Select from your Cloudflare library

2. **Selecting from Cloudflare**:
   - Click the "Cloudflare Images" tab
   - Click "Select from Cloudflare Images"
   - Browse your image library
   - Use the search bar to find specific images
   - Click on an image to select it
   - Click "Select Image" to confirm

3. **Image Preview**:
   - Selected Cloudflare images will show a preview
   - The image URL will be automatically saved to your database

### Features

- **Search**: Find images by filename or ID
- **Pagination**: Load more images as needed
- **Preview**: See thumbnails of all your images
- **Selection Indicator**: Clear visual feedback for selected images
- **Error Handling**: Graceful handling of API errors

## Image URLs

Cloudflare images are served through their CDN with the format:
```
https://imagedelivery.net/{account-id}/{image-id}/public
```

The integration automatically:
- Uses `thumbnail` variant for browsing (faster loading)
- Uses `public` variant for the final image URL
- Stores the full URL in your database

## Troubleshooting

### "Configuration Required" Error
- Ensure your `.env` file contains the correct Cloudflare credentials
- Restart your development server after adding environment variables

### "Failed to load images" Error
- Check your API token permissions
- Verify your Account ID is correct
- Ensure your Cloudflare Images service is active

### Images Not Loading
- Check if images exist in your Cloudflare Images library
- Verify the images are not set to "Require Signed URLs"

## API Rate Limits

Cloudflare Images API has rate limits:
- 1,200 requests per 5 minutes per API token
- The integration loads 50 images per request
- Pagination helps manage large image libraries

## Security Notes

- API tokens are more secure than API keys
- Environment variables keep credentials out of your code
- The integration only requires read permissions
- Images are served through Cloudflare's secure CDN

## Benefits of Cloudflare Images

1. **Performance**: Global CDN delivery
2. **Optimization**: Automatic image optimization
3. **Variants**: Multiple sizes/formats automatically generated
4. **Storage**: Centralized image management
5. **Bandwidth**: Reduced server bandwidth usage
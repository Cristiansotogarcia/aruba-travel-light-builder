# Image Upload Feature

## Overview
The admin dashboard now supports uploading images directly from the desktop to Cloudflare Images, replacing the previous image browser functionality.

## Changes Made

### 1. New Supabase Edge Function
- **File**: `supabase/functions/cloudflare-image-upload/index.ts`
- **Purpose**: Handles file uploads to Cloudflare Images API
- **Features**:
  - File validation (image types only, max 10MB)
  - Metadata support
  - Error handling
  - CORS support

### 2. New Upload Service
- **File**: `src/lib/services/cloudflareUploadService.ts`
- **Purpose**: Frontend service for handling image uploads
- **Features**:
  - File validation
  - Upload progress tracking
  - Error handling
  - Image URL generation

### 3. New Upload Component
- **File**: `src/components/admin/CloudflareImageUpload.tsx`
- **Purpose**: UI component for image upload
- **Features**:
  - Drag and drop support
  - File browser
  - Upload progress indicator
  - Image preview
  - Error handling

### 4. Updated Product Management
- **File**: `src/components/admin/ProductManagement.tsx`
- **Changes**:
  - Replaced `CloudflareImageBrowser` with `CloudflareImageUpload`
  - Updated button text and functionality
  - Updated event handlers

## How to Use

1. Navigate to Admin Dashboard → Equipment Tab
2. Click "Add Product" or edit an existing product
3. In the Image section, click "Upload Image to Cloudflare"
4. Either:
   - Drag and drop an image file onto the upload area
   - Click "Choose File" to browse and select an image
5. The image will be uploaded to Cloudflare and the URL will be saved to the database

## Supported File Types
- JPG/JPEG
- PNG
- GIF
- WebP
- Maximum file size: 10MB

## Technical Requirements

### Environment Variables
Ensure these are set in your environment:
- `CLOUDFLARE_ACCOUNT_ID` or `VITE_CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` or `VITE_CLOUDFLARE_API_TOKEN`

### Cloudflare API Token Permissions
The API token needs the following permissions:
- `Cloudflare Images:Edit`
- Account scope for your specific account

## Error Handling

The system handles various error scenarios:
- Invalid file types
- File size too large
- Network errors
- Cloudflare API errors
- Missing credentials

All errors are displayed to the user via toast notifications.

## Future Enhancements

- Bulk image upload
- Image editing capabilities
- Image compression before upload
- Multiple image variants
- Image deletion from Cloudflare
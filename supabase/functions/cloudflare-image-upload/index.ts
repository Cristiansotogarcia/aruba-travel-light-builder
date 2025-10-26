import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get Cloudflare credentials from environment
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Cloudflare credentials', accountIdPresent: !!accountId, apiTokenPresent: !!apiToken }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'Only image files are allowed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 10MB' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare form data for Cloudflare
    const cloudflareFormData = new FormData();
    cloudflareFormData.append('file', file);

    // Add metadata if provided
    if (metadata) {
      try {
        const parsedMetadata = JSON.parse(metadata);
        if (parsedMetadata.requireSignedURLs !== undefined) {
          cloudflareFormData.append('requireSignedURLs', parsedMetadata.requireSignedURLs.toString());
        }
        if (parsedMetadata.metadata) {
          cloudflareFormData.append('metadata', JSON.stringify(parsedMetadata.metadata));
        }
      } catch (e) {
        console.warn('Invalid metadata JSON:', e);
      }
    }

    // Upload to Cloudflare Images
    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;

    const response = await fetch(cloudflareUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: cloudflareFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare upload error:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        body: errorText
      });
      return new Response(
        JSON.stringify({ error: 'Failed to upload image to Cloudflare' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the successful response
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cloudflare-image-upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

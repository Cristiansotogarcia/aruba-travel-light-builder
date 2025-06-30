// Cloudflare Images Proxy Edge Function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page') || '1';
    const per_page = url.searchParams.get('per_page') || '50';
    const search = url.searchParams.get('search') || '';

  // Get Cloudflare credentials from environment
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Cloudflare credentials' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Cloudflare API URL
    let cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?page=${page}&per_page=${per_page}`;
    if (search) {
      cloudflareUrl += `&search=${encodeURIComponent(search)}`;
    }

    // Make request to Cloudflare API
    const response = await fetch(cloudflareUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch images from Cloudflare' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cloudflare-images-proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '@shared/cors.ts';

// Handle CORS preflight
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { method, params } = await req.json();

    const apiEndpoint = Deno.env.get('UMAMI_API_CLIENT_ENDPOINT');
    const apiKey = Deno.env.get('UMAMI_API_KEY');
    const websiteId = Deno.env.get('UMAMI_WEBSITE_ID');

    if (!apiEndpoint || !apiKey || !websiteId) {
      return new Response(
        JSON.stringify({ error: 'Missing API endpoint, key, or website ID' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let url = '';
    const headers = {
      'x-umami-api-key': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    switch (method) {
      case 'getWebsite':
        url = `${apiEndpoint}/websites/${websiteId}`;
        break;

      case 'getWebsiteStats':
        url = `${apiEndpoint}/websites/${websiteId}/stats?startAt=${params.startAt}&endAt=${params.endAt}&timezone=${params.timezone}`;
        break;

      case 'getWebsitePageviews':
        url = `${apiEndpoint}/websites/${websiteId}/pageviews?startAt=${params.startAt}&endAt=${params.endAt}&unit=${params.unit}&timezone=${params.timezone}`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid method' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Umami API error' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

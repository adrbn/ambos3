import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, language = 'en' } = await req.json();
    const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');

    if (!GNEWS_API_KEY) {
      throw new Error('GNEWS_API_KEY not configured');
    }

    console.log('Fetching news for query:', query, 'language:', language);

    const response = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${language}&max=20&apikey=${GNEWS_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GNews API error:', response.status, errorText);
      throw new Error(`GNews API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fetched articles count:', data.articles?.length || 0);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

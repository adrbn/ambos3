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

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${language}&max=20&apikey=${GNEWS_API_KEY}`;
    console.log('Calling GNews API:', url.replace(GNEWS_API_KEY, 'HIDDEN'));
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GNews API error:', response.status, errorText);
      throw new Error(`GNews API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('GNews API Response:', JSON.stringify(data, null, 2));
    console.log('Fetched articles count:', data.articles?.length || 0);
    
    // Check for API-level errors
    if (data.errors && data.errors.length > 0) {
      console.error('GNews API errors:', data.errors);
      throw new Error(`GNews API error: ${data.errors.join(', ')}`);
    }
    
    // Check if articles were removed due to free plan limitations
    if (data.totalArticles > 0 && (!data.articles || data.articles.length === 0)) {
      console.warn('Articles found but removed due to free plan limitations');
      return new Response(JSON.stringify({ 
        articles: [],
        totalArticles: data.totalArticles,
        error: 'Free plan limitation: Articles older than 30 days are not available. Try searching for recent news topics (last 2-3 weeks).'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

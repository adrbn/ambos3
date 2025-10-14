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
    const { query } = await req.json();
    console.log('Fetching from Google Custom Search with query:', query);

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');
    
    if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error('Google API credentials not configured');
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', response.status, errorText);
      throw new Error(`Google API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Google returned:', data.items?.length || 0, 'results');

    // Transform Google results to our article format
    const articles = (data.items || []).map((item: any) => {
      return {
        title: item.title || 'Sans titre',
        description: item.snippet || '',
        url: item.link || '',
        publishedAt: new Date().toISOString(),
        source: {
          name: item.displayLink || 'Web',
          platform: 'web',
        },
        author: item.displayLink || 'Unknown',
        content: item.snippet || '',
        osint: true,
        platform: 'web',
        webResult: true,
        image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src,
      };
    });

    return new Response(
      JSON.stringify({ articles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-google function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        articles: [] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

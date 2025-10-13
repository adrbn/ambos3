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
    console.log('Fetching from Gopher AI with query:', query);

    const GOPHER_API_KEY = Deno.env.get('GOPHER_API_KEY');
    if (!GOPHER_API_KEY) {
      throw new Error('GOPHER_API_KEY not configured');
    }

    // Gopher AI unified search endpoint
    const response = await fetch('https://data.gopher-ai.com/api/v1/search/live', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'twitter',
        arguments: {
          type: 'searchbyquery',
          query: query,
          max_results: 50,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gopher API error:', response.status, errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gopher AI returned:', data.data?.length || 0, 'results');

    // Transform Gopher results to our article format
    const articles = (data.data || []).map((item: any) => ({
      title: item.full_text?.substring(0, 100) || item.text?.substring(0, 100) || 'Sans titre',
      description: item.full_text || item.text || '',
      url: item.url || `https://twitter.com/user/status/${item.id}`,
      publishedAt: item.created_at || new Date().toISOString(),
      source: {
        name: `X/Twitter - ${item.user?.screen_name || item.author || 'Unknown'}`,
        platform: 'twitter',
      },
      author: item.user?.name || item.user?.screen_name || item.author || 'Unknown',
      content: item.full_text || item.text || '',
      osint: true,
      platform: 'twitter',
      engagement: {
        likes: item.favorite_count || item.likes || 0,
        shares: item.retweet_count || item.shares || 0,
        comments: item.reply_count || item.comments || 0,
      },
      author_location: item.user?.location,
      location: item.geo?.full_name || item.place?.full_name,
    }));

    return new Response(
      JSON.stringify({ articles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-gopher function:', error);
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

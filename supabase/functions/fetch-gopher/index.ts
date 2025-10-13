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

    // Gopher AI Data API endpoint - using searchbyquery for real-time data
    const response = await fetch('https://data.gopher-ai.com/api/v1/twitter/searchbyquery', {
      method: 'POST',
      headers: {
        'X-API-KEY': GOPHER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        count: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gopher API error:', response.status, errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gopher AI returned:', data.data?.length || 0, 'tweets');

    // Transform Gopher Twitter results to our article format
    const articles = (data.data || []).map((tweet: any) => ({
      title: tweet.full_text?.substring(0, 100) || tweet.text?.substring(0, 100) || 'Sans titre',
      description: tweet.full_text || tweet.text || '',
      url: `https://twitter.com/user/status/${tweet.id}`,
      publishedAt: tweet.created_at || new Date().toISOString(),
      source: {
        name: `X/Twitter - ${tweet.user?.screen_name || 'Unknown'}`,
        platform: 'twitter',
      },
      author: tweet.user?.name || tweet.user?.screen_name || 'Unknown',
      content: tweet.full_text || tweet.text || '',
      osint: true,
      platform: 'twitter',
      engagement: {
        likes: tweet.favorite_count || 0,
        shares: tweet.retweet_count || 0,
        comments: tweet.reply_count || 0,
      },
      author_location: tweet.user?.location,
      location: tweet.geo?.full_name || tweet.place?.full_name,
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

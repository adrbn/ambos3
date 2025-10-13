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

    // Gopher AI API endpoint for multi-platform search
    const response = await fetch('https://api.gopher.ai/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        platforms: ['twitter', 'reddit', 'tiktok'],
        limit: 50,
        include_metadata: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gopher API error:', response.status, errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gopher AI returned:', data.results?.length || 0, 'results');

    // Transform Gopher results to our article format
    const articles = (data.results || []).map((item: any) => ({
      title: item.title || item.text?.substring(0, 100) || 'Untitled',
      description: item.text || item.content || '',
      url: item.url || item.post_url || '',
      publishedAt: item.created_at || item.timestamp || new Date().toISOString(),
      source: {
        name: `${item.platform || 'Unknown'} - ${item.author || 'Unknown'}`,
        platform: item.platform,
      },
      author: item.author || item.username || 'Unknown',
      content: item.full_text || item.text || '',
      osint: true,
      platform: item.platform,
      engagement: {
        likes: item.likes || item.upvotes || 0,
        shares: item.shares || item.retweets || 0,
        comments: item.comments || item.replies || 0,
      },
      author_location: item.author_location || item.user_location,
      location: item.location || item.geo_location,
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

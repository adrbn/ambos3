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
    console.log('====================================');
    console.log('🔍 GOPHER AI FETCH START');
    console.log('Query:', query);
    console.log('====================================');

    const GOPHER_API_KEY = Deno.env.get('GOPHER_API_KEY');
    if (!GOPHER_API_KEY) {
      console.error('❌ GOPHER_API_KEY NOT FOUND IN ENV');
      throw new Error('GOPHER_API_KEY not configured');
    }

    console.log('✓ API Key found (length:', GOPHER_API_KEY.length, ')');

    // Gopher AI unified search endpoint
    const requestBody = {
      type: 'twitter',
      arguments: {
        type: 'searchbyquery',
        query: query,
        max_results: 50,
      },
    };

    console.log('📤 Sending to Gopher:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://data.gopher-ai.com/api/v1/search/live', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 Gopher response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GOPHER API ERROR:');
      console.error('Status:', response.status);
      console.error('Body:', errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Gopher raw response keys:', Object.keys(data));
    console.log('📊 Data array length:', data.data?.length || 0);

    if (data.data && data.data.length > 0) {
      console.log('✅ First result sample:', JSON.stringify(data.data[0], null, 2).substring(0, 300));
    }

    // Transform Gopher results to our article format
    const articles = (data.data || []).map((item: any) => {
      const text = item.full_text || item.text || item.tweet_text || '';
      const username = item.user?.screen_name || item.user?.username || item.author || 'Unknown';
      
      console.log('🔄 Processing tweet from @' + username);
      
      return {
        title: text.substring(0, 100) || 'Sans titre',
        description: text,
        url: item.url || item.tweet_url || `https://twitter.com/${username}/status/${item.id}`,
        publishedAt: item.created_at || item.timestamp || new Date().toISOString(),
        source: {
          name: `X/Twitter - @${username}`,
          platform: 'twitter',
        },
        author: item.user?.name || username,
        content: text,
        osint: {
          platform: 'twitter',
          credibilityScore: 70, // Default score
          engagement: {
            likes: item.favorite_count || item.likes || item.like_count || 0,
            reposts: item.retweet_count || item.shares || item.retweet_count || 0,
            replies: item.reply_count || item.comments || item.reply_count || 0,
          },
        },
        author_location: item.user?.location || item.location,
        location: item.geo?.full_name || item.place?.full_name || item.geo,
      };
    });

    console.log('====================================');
    console.log('✅ GOPHER FETCH COMPLETE');
    console.log('Total articles:', articles.length);
    console.log('====================================');

    return new Response(
      JSON.stringify({ 
        articles,
        totalResults: articles.length,
        api: 'gopher',
        sourceType: 'osint',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('====================================');
    console.error('💥 GOPHER FATAL ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('====================================');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        articles: [],
        debug: {
          errorType: error.constructor.name,
          hasApiKey: !!Deno.env.get('GOPHER_API_KEY'),
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

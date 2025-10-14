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
    console.log('========================================');
    console.log('🔍 GOPHER AI - Début fetch');
    console.log('Query:', query);
    console.log('========================================');

    const GOPHER_API_KEY = Deno.env.get('GOPHER_API_KEY');
    if (!GOPHER_API_KEY) {
      console.error('❌ GOPHER_API_KEY not configured');
      throw new Error('GOPHER_API_KEY not configured');
    }

    console.log('✅ API Key trouvée (longueur:', GOPHER_API_KEY.length, ')');

    const requestBody = {
      type: 'twitter',
      arguments: {
        type: 'searchbyquery',
        query: query,
        max_results: 50,
      },
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://data.gopher-ai.com/api/v1/search/live', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gopher API error:', response.status, errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Response data structure:', JSON.stringify(Object.keys(data), null, 2));
    
    if (data.data) {
      console.log('✅ data.data exists, length:', data.data.length);
      if (data.data.length > 0) {
        console.log('📌 Premier élément structure:', JSON.stringify(Object.keys(data.data[0]), null, 2));
        console.log('📌 Premier élément complet:', JSON.stringify(data.data[0], null, 2));
      }
    } else {
      console.log('⚠️  data.data n\'existe pas. Clés disponibles:', Object.keys(data));
    }

    // Vérifier plusieurs structures possibles
    let rawResults = data.data || data.results || data.tweets || [];
    
    console.log(`🔢 Résultats bruts: ${rawResults.length} items`);

    // Transform Gopher results to our article format
    const articles = rawResults.map((item: any, index: number) => {
      console.log(`\n--- Article ${index + 1} ---`);
      console.log('Keys:', Object.keys(item));
      
      // Essayer différentes propriétés possibles
      const text = item.full_text || item.text || item.tweet_text || item.content || '';
      const username = item.user?.screen_name || item.user?.username || item.author || item.screen_name || 'Unknown';
      const userId = item.user?.id || item.user_id || item.id || '';
      const tweetId = item.id_str || item.id || item.tweet_id || '';
      const createdAt = item.created_at || item.timestamp || item.date || new Date().toISOString();
      const name = item.user?.name || item.name || username;
      
      console.log('Text:', text.substring(0, 50));
      console.log('Username:', username);
      console.log('Created:', createdAt);
      
      const article = {
        title: text.substring(0, 100) || 'Sans titre',
        description: text,
        url: item.url || item.tweet_url || `https://twitter.com/${username}/status/${tweetId}`,
        publishedAt: createdAt,
        source: {
          name: `X/Twitter - @${username}`,
          platform: 'twitter',
        },
        author: name,
        content: text,
        osint: {
          platform: 'twitter',
          credibilityScore: 70, // Score par défaut, à ajuster
          engagement: {
            likes: item.favorite_count || item.likes || item.like_count || 0,
            reposts: item.retweet_count || item.shares || item.retweets || 0,
            replies: item.reply_count || item.comments || item.replies || 0,
          },
          verified: item.user?.verified || item.verified || false,
          accountMetrics: {
            followers: item.user?.followers_count || 0,
            following: item.user?.friends_count || 0,
          },
        },
        location: item.user?.location || item.location || null,
        raw: item, // Garder l'objet brut pour debug
      };
      
      return article;
    });

    console.log('\n========================================');
    console.log(`✅ SUCCÈS: ${articles.length} articles transformés`);
    console.log('========================================');

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
    console.error('========================================');
    console.error('💥 ERREUR FATALE dans fetch-gopher:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');
    
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

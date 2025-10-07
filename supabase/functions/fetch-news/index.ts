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
    const { query, language = 'en', api = 'gnews' } = await req.json();
    
    console.log('Fetching news for query:', query, 'language:', language, 'api:', api);

    let url: string;
    let apiKey: string | undefined;
    
    if (api === 'newsapi') {
      const NEWSAPI_KEY = Deno.env.get('NEWSAPI_KEY');
      if (!NEWSAPI_KEY) {
        throw new Error('NEWSAPI_KEY not configured');
      }
      apiKey = NEWSAPI_KEY;
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${language}&pageSize=20&apiKey=${apiKey}`;
      console.log('Calling NewsAPI:', url.replace(apiKey, 'HIDDEN'));
    } else {
      const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');
      if (!GNEWS_API_KEY) {
        throw new Error('GNEWS_API_KEY not configured');
      }
      apiKey = GNEWS_API_KEY;
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${language}&max=20&apikey=${apiKey}`;
      console.log('Calling GNews API:', url.replace(apiKey, 'HIDDEN'));
    }
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GNews API error:', response.status, errorText);
      
      // Handle rate limiting specifically
      if (response.status === 403 && errorText.includes('request limit')) {
        return new Response(JSON.stringify({ 
          articles: [],
          error: 'API rate limit reached. The news API resets daily at midnight UTC. Please try again later or upgrade your API plan.',
          isRateLimitError: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 so the client can read the error details
        });
      }
      
      throw new Error(`GNews API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // Normalize the response based on API
    let articles = data.articles || [];
    
    if (api === 'newsapi') {
      // NewsAPI has a different structure, normalize it
      articles = articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.urlToImage, // NewsAPI uses urlToImage
        publishedAt: article.publishedAt,
        source: article.source
      }));
    }
    
    console.log('Fetched articles count:', articles.length);
    
    // Check for API-level errors
    if (data.errors && data.errors.length > 0) {
      console.error('API errors:', data.errors);
      throw new Error(`API error: ${data.errors.join(', ')}`);
    }
    
    // Handle NewsAPI error responses
    if (data.status === 'error') {
      console.error('API error:', data.message);
      throw new Error(`API error: ${data.message}`);
    }
    
    // Check if articles were removed due to free plan limitations
    if (data.totalArticles > 0 && (!articles || articles.length === 0)) {
      console.warn('Articles found but removed due to free plan limitations');
      return new Response(JSON.stringify({ 
        articles: [],
        totalArticles: data.totalArticles,
        error: 'Free plan limitation: Articles older than 30 days are not available. Try searching for recent news topics (last 2-3 weeks).'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ articles }), {
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

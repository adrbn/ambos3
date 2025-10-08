import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Constantes pour les en-têtes CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constantes pour les API
const MEDIASTACK_ENDPOINT = 'http://api.mediastack.com/v1/news';
const GNEWS_ENDPOINT = 'https://gnews.io/api/v4/search';
const NEWSAPI_ENDPOINT = 'https://newsapi.org/v2/everything';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🟢 CODE PROPRE : On utilise la valeur de l'API envoyée par le client
    const { query, language, api: selectedApi } = await req.json(); 

    if (!query || !language) {
      return new Response(JSON.stringify({ error: 'Missing query or language' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let url: URL;
    let apiKey: string | undefined;
    let headers: Record<string, string> = {};

    // --- Configuration de l'API ---
    if (selectedApi === 'gnews') {
      apiKey = Deno.env.get('GNEWS_API_KEY'); 
      url = new URL(GNEWS_ENDPOINT);
      url.searchParams.append('q', query);
      url.searchParams.append('lang', language);
      url.searchParams.append('token', apiKey || '');
      url.searchParams.append('max', '10');
    } else if (selectedApi === 'newsapi') {
      apiKey = Deno.env.get('NEWSAPI_KEY');
      url = new URL(NEWSAPI_ENDPOINT);
      url.searchParams.append('q', query);
      url.searchParams.append('language', language);
      url.searchParams.append('pageSize', '10');
      headers['X-Api-Key'] = apiKey || '';
    } else if (selectedApi === 'mediastack') {
      apiKey = Deno.env.get('MEDIASTACK_KEY');
      url = new URL(MEDIASTACK_ENDPOINT);
      url.searchParams.append('keywords', query);
      url.searchParams.append('language', language);
      url.searchParams.append('access_key', apiKey || '');
      url.searchParams.append('limit', '10');
    } else {
      return new Response(JSON.stringify({ error: 'Invalid API selected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key (${selectedApi}) not configured in environment variables.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // 1. Appel API
    const response = await fetch(url.toString(), { headers });
    
    // 2. Gestion des erreurs non-200 (4xx, 5xx)
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body or body stream consumed.');
      console.error('API Error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `API error (${response.status} from ${selectedApi}): ${errorText.substring(0, 100)}...`,
        isRateLimitError: response.status === 429 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    const data = await response.json();
    
    // 3. Normalisation des données
    let articles: any[] = [];
    let totalArticles = 0;

    if (selectedApi === 'mediastack' && data.data) {
        articles = data.data.map((article: any) => ({
            title: article.title,
            description: article.description,
            url: article.url,
            image: article.image,
            publishedAt: article.published_at,
            source: { id: article.source, name: article.source },
        }));
        totalArticles = articles.length; 
    } else if (selectedApi === 'newsapi' && data.articles) {
        articles = data.articles.map((article: any) => ({
            title: article.title,
            description: article.description,
            url: article.url,
            image: article.urlToImage,
            publishedAt: article.publishedAt,
            source: article.source,
        }));
        totalArticles = data.totalResults || articles.length;
    } else if (data.articles) { 
        // GNews (le format de base)
        articles = data.articles;
        totalArticles = data.totalArticles || articles.length;
    }

    // 4. Gestion des erreurs contenues dans le corps (statut 200)
    if (data.status === 'error' || (data.errors && data.errors.length > 0)) {
        console.error('API error in body:', data);
        const errorMessage = data.message || (data.errors ? data.errors.join(', ') : 'Unknown API error');
        
        return new Response(JSON.stringify({ 
            articles: [],
            error: `API error from ${selectedApi}: ${errorMessage}`,
            isRateLimitError: (data.code === 'rateLimited' || errorMessage.includes('request limit'))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, 
        });
    }
    
    // 5. Réponse réussie
    return new Response(JSON.stringify({ 
      articles, 
      totalArticles, 
      api: selectedApi 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
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

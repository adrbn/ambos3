import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Remplacement de l'ancienne importation 'https://deno.land/x/xhr@0.1.0/mod.ts' qui n'est pas nécessaire ici

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
    // Le front-end envoie maintenant 'api' et nous avons besoin de 'query' et 'language'
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
      // NewsAPI nécessite la clé dans un header ou dans l'URL, utilisons un header pour la sécurité
      url = new URL(NEWSAPI_ENDPOINT);
      url.searchParams.append('q', query);
      url.searchParams.append('language', language);
      url.searchParams.append('pageSize', '10');
      headers['X-Api-Key'] = apiKey || ''; // NewsAPI utilise un header
    } else if (selectedApi === 'mediastack') {
      apiKey = Deno.env.get('MEDIASTACK_KEY');
      url = new URL(MEDIASTACK_ENDPOINT);
      url.searchParams.append('keywords', query);
      url.searchParams.append('language', language);
      url.searchParams.append('access_key', apiKey || ''); // Mediastack utilise la clé dans l'URL
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
      // Tente de lire le corps de la réponse. Le .catch() prévient l'erreur de "body stream already read"
      const errorText = await response.text().catch(() => 'No response body or body stream consumed.');
      console.error('API Error:', response.status, errorText);
      
      // La fonction Edge doit renvoyer un statut non-2xx pour que le client (SearchBar.tsx) décode
      // correctement le message réel de l'API.
      return new Response(JSON.stringify({ 
        error: `API error (${response.status} from ${selectedApi}): ${errorText.substring(0, 100)}...`,
        isRateLimitError: response.status === 429 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status, // Renvoyer le statut réel pour le client (SearchBar.tsx)
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
            source: article.source, // NewsAPI fournit source.id et source.name
        }));
        totalArticles = data.totalResults || articles.length;
    } else if (data.articles) { 
        // GNews (le format de base de votre ancien code)
        articles = data.articles;
        totalArticles = data.totalArticles || articles.length;
    }

    // 4. Gestion des erreurs contenues dans le corps (statut 200)
    if (data.status === 'error' || (data.errors && data.errors.length > 0)) {
        console.error('API error in body:', data);
        const errorMessage = data.message || (data.errors ? data.errors.join(', ') : 'Unknown API error');
        
        // On retourne l'erreur dans un corps 200 pour le front-end comme avant.
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

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEDIASTACK_ENDPOINT = 'http://api.mediastack.com/v1/news';
const GNEWS_ENDPOINT = 'https://gnews.io/api/v4/search';
const NEWSAPI_ENDPOINT = 'https://newsapi.org/v2/everything';

async function fetchFromAPI(api: string, query: string, language: string) {
  let url: URL;
  let apiKey: string | undefined;
  let headers: Record<string, string> = {};

  if (api === 'gnews') {
    apiKey = Deno.env.get('GNEWS_API_KEY');
    url = new URL(GNEWS_ENDPOINT);
    url.searchParams.append('q', query);
    url.searchParams.append('lang', language);
    url.searchParams.append('token', apiKey || '');
    url.searchParams.append('max', '10');
    url.searchParams.append('sortby', 'publishedAt'); // Sort by date
  } else if (api === 'newsapi') {
    apiKey = Deno.env.get('NEWSAPI_KEY');
    url = new URL(NEWSAPI_ENDPOINT);
    url.searchParams.append('q', query);
    url.searchParams.append('language', language);
    url.searchParams.append('pageSize', '10');
    url.searchParams.append('sortBy', 'publishedAt'); // Sort by date
    headers['X-Api-Key'] = apiKey || '';
  } else if (api === 'mediastack') {
    apiKey = Deno.env.get('MEDIASTACK_KEY');
    url = new URL(MEDIASTACK_ENDPOINT);
    url.searchParams.append('keywords', query);
    url.searchParams.append('language', language);
    url.searchParams.append('access_key', apiKey || '');
    url.searchParams.append('limit', '10');
    url.searchParams.append('sort', 'published_desc'); // Sort by date
  } else {
    throw new Error('Invalid API');
  }

  if (!apiKey) {
    throw new Error(`API key (${api}) not configured`);
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    throw new Error(`API error (${response.status} from ${api})`);
  }

  const data = await response.json();

  // Normalize data
  let articles: any[] = [];

  if (api === 'mediastack' && data.data) {
    articles = data.data.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      publishedAt: article.published_at,
      source: { id: article.source, name: article.source },
    }));
  } else if (api === 'newsapi' && data.articles) {
    articles = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source,
    }));
  } else if (data.articles) {
    articles = data.articles;
  }

  return articles;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, language, api: selectedApi } = await req.json();

    if (!query || !language) {
      return new Response(JSON.stringify({ error: 'Missing query or language' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let allArticles: any[] = [];

    if (selectedApi === 'mixed') {
      // Fetch from all APIs in parallel
      const apis = ['gnews', 'newsapi', 'mediastack'];
      const results = await Promise.allSettled(
        apis.map(api => fetchFromAPI(api, query, language))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allArticles = [...allArticles, ...result.value];
        } else {
          console.error(`Error from ${apis[index]}:`, result.reason);
        }
      });

      // Sort by date (most recent first)
      allArticles.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
      });

      // Remove duplicates based on URL
      const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex((a) => a.url === article.url)
      );

      return new Response(JSON.stringify({
        articles: uniqueArticles.slice(0, 30), // Limit to 30 most recent
        totalArticles: uniqueArticles.length,
        api: 'mixed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Single API fetch
      const articles = await fetchFromAPI(selectedApi, query, language);

      return new Response(JSON.stringify({
        articles,
        totalArticles: articles.length,
        api: selectedApi
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Error in fetch-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

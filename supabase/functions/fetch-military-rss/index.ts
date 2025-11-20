import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Italian military and defense RSS feeds
const MILITARY_RSS_FEEDS = [
  {
    name: 'Analisi Difesa',
    url: 'https://www.analisidifesa.it/feed/',
    language: 'it',
  },
  {
    name: 'Ares Difesa',
    url: 'https://aresdifesa.it/feed/',
    language: 'it',
  },
  {
    name: 'Aviation Report',
    url: 'https://www.aviation-report.com/feed/',
    language: 'it',
  },
  {
    name: 'Difesa Online',
    url: 'https://www.difesaonline.it/feed',
    language: 'it',
  },
  {
    name: 'Report Difesa',
    url: 'https://www.reportdifesa.it/feed/',
    language: 'it',
  },
  {
    name: 'Rivista Italiana Difesa',
    url: 'https://www.rid.it/feed/',
    language: 'it',
  },
  {
    name: 'Ministero della Difesa',
    url: 'https://www.difesa.it/RSS/Pagine/default.aspx',
    language: 'it',
  },
  {
    name: 'Stato Maggiore della Difesa',
    url: 'https://www.difesa.it/SMD_/Comunicati/Pagine/default.aspx?tipo=Notizia&Rss=1',
    language: 'it',
  },
  {
    name: 'Esercito Italiano',
    url: 'https://www.esercito.difesa.it/comunicazione/Pagine/default.aspx?Rss=1',
    language: 'it',
  },
  {
    name: 'Marina Militare',
    url: 'https://www.marina.difesa.it/media-cultura/Notiziario-online/Pagine/default.aspx?Rss=1',
    language: 'it',
  },
  {
    name: 'Aeronautica Militare',
    url: 'https://www.aeronautica.difesa.it/home/media-e-comunicazione/notizie/Pagine/default.aspx?Rss=1',
    language: 'it',
  },
  {
    name: 'Direzione Nazionale degli Armamenti',
    url: 'https://www.difesa.it/SGD-DNA/Notizie/Pagine/default.aspx?tipo=Notizia&Rss=1',
    language: 'it',
  },
];

async function parseRSSFeed(feedUrl: string, sourceName: string) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    
    // Simple regex-based XML parsing (more reliable for RSS in Deno)
    const articles: any[] = [];
    
    // Match all <item>...</item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = xmlText.matchAll(itemRegex);
    
    for (const match of items) {
      const itemContent = match[1];
      
      // Extract fields using regex
      const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const descriptionMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const creatorMatch = itemContent.match(/<(?:dc:)?creator[^>]*>([\s\S]*?)<\/(?:dc:)?creator>/i);
      
      const title = titleMatch ? titleMatch[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
      const description = descriptionMatch ? descriptionMatch[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const creator = creatorMatch ? creatorMatch[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : 'Unknown';

      if (title && link) {
        articles.push({
          title: title.replace(/<[^>]*>/g, ''),
          description: description.replace(/<[^>]*>/g, ''),
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: {
            name: sourceName,
            language: 'it',
          },
          author: creator,
          content: description.replace(/<[^>]*>/g, ''),
          military: true,
          rss: true,
          platform: 'military-rss',
        });
      }
    }

    console.log(`Fetched ${articles.length} articles from ${sourceName}`);
    return articles;
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Fetching from Italian military RSS feeds with query:', query);

    // Fetch from all RSS feeds in parallel
    const fetchPromises = MILITARY_RSS_FEEDS.map(feed => 
      parseRSSFeed(feed.url, feed.name)
    );

    const results = await Promise.all(fetchPromises);
    let allArticles = results.flat();

    // Filter by query if provided
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      allArticles = allArticles.filter(article => {
      const searchableText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        return searchTerms.some((term: string) => searchableText.includes(term));
      });
    }

    // Sort by date (most recent first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    console.log(`Returning ${allArticles.length} military RSS articles`);

    return new Response(
      JSON.stringify({ articles: allArticles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-military-rss function:', error);
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

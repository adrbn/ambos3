import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
    const response = await fetch(feedUrl);
    if (!response.ok) {
      console.error(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    if (!doc) {
      console.error(`Failed to parse XML from ${sourceName}`);
      return [];
    }

    const items = doc.querySelectorAll('item');
    const articles: any[] = [];

    for (const item of items) {
      const itemElement = item as any;
      const title = itemElement.querySelector('title')?.textContent?.trim() || '';
      const link = itemElement.querySelector('link')?.textContent?.trim() || '';
      const description = itemElement.querySelector('description')?.textContent?.trim() || '';
      const pubDate = itemElement.querySelector('pubDate')?.textContent?.trim() || '';
      const creator = itemElement.querySelector('dc\\:creator')?.textContent?.trim() || 
                     itemElement.querySelector('creator')?.textContent?.trim() || 'Unknown';

      if (title && link) {
        articles.push({
          title,
          description: description.replace(/<[^>]*>/g, ''), // Strip HTML tags
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

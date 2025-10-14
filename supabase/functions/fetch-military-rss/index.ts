import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feeds RSS militaires italiens - URLs vérifiées et fonctionnelles
const MILITARY_RSS_FEEDS = [
  {
    name: 'Analisi Difesa',
    url: 'https://www.analisidifesa.it/feed/',
    language: 'it',
    active: true,
  },
  {
    name: 'Difesa Online',
    url: 'https://www.difesaonline.it/feed',
    language: 'it',
    active: true,
  },
  {
    name: 'Report Difesa',
    url: 'https://www.reportdifesa.it/feed/',
    language: 'it',
    active: true,
  },
  {
    name: 'Aviation Report',
    url: 'https://www.aviation-report.com/feed/',
    language: 'it',
    active: true,
  },
  {
    name: 'Ares Difesa',
    url: 'https://aresdifesa.it/feed/',
    language: 'it',
    active: true,
  },
];

async function parseRSSFeed(feedUrl: string, sourceName: string, retries = 2): Promise<any[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[${sourceName}] Tentative ${attempt + 1}/${retries + 1}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[${sourceName}] HTTP ${response.status}: ${response.statusText}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        return [];
      }

      const xmlText = await response.text();
      
      // Simple XML parsing without external dependencies
      const articles = parseXMLManually(xmlText, sourceName);
      
      console.log(`[${sourceName}] ✓ ${articles.length} articles récupérés`);
      return articles;
      
    } catch (error) {
      console.error(`[${sourceName}] Erreur tentative ${attempt + 1}:`, error.message);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        return [];
      }
    }
  }
  return [];
}

function parseXMLManually(xmlText: string, sourceName: string): any[] {
  const articles: any[] = [];
  
  try {
    // Extract all <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];
    
    for (const item of items) {
      try {
        // Extract fields using regex
        const title = extractTag(item, 'title');
        const link = extractTag(item, 'link');
        const description = extractTag(item, 'description');
        const pubDate = extractTag(item, 'pubDate');
        const creator = extractTag(item, 'dc:creator') || extractTag(item, 'creator') || 'Unknown';
        const content = extractTag(item, 'content:encoded') || description;
        
        if (title && link) {
          articles.push({
            title: cleanHtml(title),
            description: cleanHtml(description),
            url: link.trim(),
            publishedAt: parseDate(pubDate),
            source: {
              name: sourceName,
              language: 'it',
            },
            author: cleanHtml(creator),
            content: cleanHtml(content),
            military: true,
            rss: true,
          });
        }
      } catch (itemError) {
        console.error(`[${sourceName}] Error parsing item:`, itemError);
      }
    }
  } catch (error) {
    console.error(`[${sourceName}] Error in parseXMLManually:`, error);
  }
  
  return articles;
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function cleanHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('=== DEBUT FETCH MILITARY RSS ===');
    console.log(`Query: "${query}"`);

    // Fetch from all RSS feeds in parallel
    const fetchPromises = MILITARY_RSS_FEEDS
      .filter(feed => feed.active)
      .map(feed => parseRSSFeed(feed.url, feed.name));

    const results = await Promise.all(fetchPromises);
    let allArticles = results.flat();

    console.log(`Total articles avant filtre: ${allArticles.length}`);

    // Filter by query if provided
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
      const beforeFilter = allArticles.length;
      
      allArticles = allArticles.filter(article => {
        const searchableText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        return searchTerms.some((term: string) => searchableText.includes(term));
      });
      
      console.log(`Filtré de ${beforeFilter} à ${allArticles.length} articles pour "${query}"`);
    }

    // Sort by date (most recent first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    console.log(`=== FIN: ${allArticles.length} articles retournés ===`);

    return new Response(
      JSON.stringify({ 
        articles: allArticles,
        totalResults: allArticles.length,
        sources: MILITARY_RSS_FEEDS.filter(f => f.active).map(f => f.name),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('=== ERREUR FATALE ===');
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

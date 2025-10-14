import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feeds RSS militaires italiens
const MILITARY_RSS_FEEDS = [
  {
    name: 'Analisi Difesa',
    url: 'https://www.analisidifesa.it/feed/',
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
];

async function parseRSSFeed(feedUrl: string, sourceName: string) {
  console.log(`\n┌─────────────────────────────────────`);
  console.log(`│ 🔄 Fetching: ${sourceName}`);
  console.log(`│ 📍 URL: ${feedUrl}`);
  console.log(`└─────────────────────────────────────`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`│ ⏰ TIMEOUT for ${sourceName}`);
      controller.abort();
    }, 15000);
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`│ 📊 Status: ${response.status} ${response.statusText}`);
    console.log(`│ 📄 Content-Type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.log(`│ ❌ HTTP Error ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    console.log(`│ 📏 XML Size: ${xmlText.length} bytes`);
    console.log(`│ 🔍 First 200 chars: ${xmlText.substring(0, 200).replace(/\n/g, ' ')}`);
    
    const articles = parseXMLManually(xmlText, sourceName);
    
    console.log(`│ ✅ Parsed: ${articles.length} articles`);
    if (articles.length > 0) {
      console.log(`│ 📰 Sample: ${articles[0].title.substring(0, 60)}...`);
    }
    
    return articles;
    
  } catch (error) {
    console.log(`│ 💥 ERROR: ${error.message}`);
    return [];
  }
}

function parseXMLManually(xmlText: string, sourceName: string): any[] {
  const articles: any[] = [];
  
  try {
    // Extract all <item> blocks with more flexible regex
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    
    if (!itemMatches) {
      console.log(`│ ⚠️  No <item> tags found in XML`);
      return [];
    }

    console.log(`│ 📦 Found ${itemMatches.length} <item> blocks`);
    
    for (let i = 0; i < itemMatches.length; i++) {
      const item = itemMatches[i];
      
      try {
        const title = extractTag(item, 'title');
        const link = extractTag(item, 'link');
        const description = extractTag(item, 'description');
        const pubDate = extractTag(item, 'pubDate');
        const creator = extractTag(item, 'dc:creator') || extractTag(item, 'creator') || 'Unknown';
        
        if (!title || !link) {
          console.log(`│   ⚠️  Item ${i+1}: Missing title or link`);
          continue;
        }

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
          content: cleanHtml(description),
          military: true,
          rss: true,
        });

        if (i === 0) {
          console.log(`│   📰 First article: ${cleanHtml(title).substring(0, 50)}...`);
        }
      } catch (itemError) {
        console.log(`│   ❌ Error parsing item ${i+1}: ${itemError.message}`);
      }
    }
  } catch (error) {
    console.log(`│ 💥 Parse error: ${error.message}`);
  }
  
  return articles;
}

function extractTag(xml: string, tagName: string): string {
  // Try with namespace prefix
  let regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  let match = xml.match(regex);
  
  if (!match) {
    // Try without namespace
    const simpleName = tagName.split(':').pop();
    regex = new RegExp(`<${simpleName}[^>]*>([\\s\\S]*?)<\\/${simpleName}>`, 'i');
    match = xml.match(regex);
  }
  
  return match ? match[1].trim() : '';
}

function cleanHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
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
    
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  🎖️  MILITARY RSS FETCH START           ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`📝 Query: "${query || 'ALL'}"`);
    console.log(`🌐 Feeds: ${MILITARY_RSS_FEEDS.length}`);

    // Fetch from all RSS feeds sequentially for better logging
    let allArticles: any[] = [];
    
    for (const feed of MILITARY_RSS_FEEDS) {
      const feedArticles = await parseRSSFeed(feed.url, feed.name);
      allArticles = [...allArticles, ...feedArticles];
      // Small delay between feeds
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Total articles before filter: ${allArticles.length}`);

    // Filter by query if provided
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
      console.log(`🔍 Filtering with terms: ${searchTerms.join(', ')}`);
      
      const beforeFilter = allArticles.length;
      allArticles = allArticles.filter(article => {
        const searchableText = `${article.title} ${article.description}`.toLowerCase();
        return searchTerms.some((term: string) => searchableText.includes(term));
      });
      
      console.log(`✂️  Filtered: ${beforeFilter} → ${allArticles.length} articles`);
    }

    // Sort by date
    allArticles.sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log(`║  ✅ MILITARY RSS COMPLETE                ║`);
    console.log(`║  📰 Returning: ${allArticles.length.toString().padStart(3)} articles              ║`);
    console.log('╚═══════════════════════════════════════════╝\n');

    if (allArticles.length > 0) {
      console.log('📋 Sample articles:');
      allArticles.slice(0, 3).forEach((a, i) => {
        console.log(`  ${i+1}. [${a.source.name}] ${a.title.substring(0, 60)}...`);
      });
    }

    return new Response(
      JSON.stringify({ 
        articles: allArticles,
        totalResults: allArticles.length,
        sources: MILITARY_RSS_FEEDS.map(f => f.name),
        api: 'military-rss',
        sourceType: 'rss',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════╗');
    console.error('║  💥 FATAL ERROR                          ║');
    console.error('╚═══════════════════════════════════════════╝');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        articles: [],
        debug: {
          errorType: error.constructor.name,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

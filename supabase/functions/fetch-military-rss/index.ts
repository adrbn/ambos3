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
  console.log(`\n┌─────────────────────────────────────────┐`);
  console.log(`│ 📡 Fetch: ${sourceName.padEnd(28)}│`);
  console.log(`└─────────────────────────────────────────┘`);
  console.log(`🔗 URL: ${feedUrl}`);
  
  try {
    console.log('⏳ Envoi requête HTTP...');
    const startTime = Date.now();
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Réponse reçue en ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}`);
      const errorBody = await response.text();
      console.error(`📄 Error body (100 chars):`, errorBody.substring(0, 100));
      return [];
    }
    
    console.log('📖 Lecture du corps de la réponse...');
    const xmlText = await response.text();
    console.log(`📏 Taille XML: ${xmlText.length} caractères`);
    console.log(`🔍 Premiers 200 chars:`, xmlText.substring(0, 200));
    
    // Simple regex-based parsing
    console.log('🔨 Parsing XML...');
    const articles: any[] = [];
    
    // Extract all <item> elements
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];
    console.log(`📰 Items trouvés: ${items.length}`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`  📄 Item ${i + 1}/${items.length}...`);
      
      try {
        const title = extractTag(item, 'title');
        const link = extractTag(item, 'link') || extractTag(item, 'guid');
        const description = extractTag(item, 'description');
        const pubDate = extractTag(item, 'pubDate');
        const creator = extractTag(item, 'dc:creator') || extractTag(item, 'creator') || 'Unknown';
        const content = extractTag(item, 'content:encoded') || description;
        
        console.log(`     Title: ${title.substring(0, 50)}...`);
        console.log(`     Link: ${link}`);
        
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
            content: cleanHtml(content).substring(0, 500),
            military: true,
            rss: true,
          });
          console.log(`     ✅ Article ajouté`);
        } else {
          console.log(`     ⚠️  Skipped (missing title or link)`);
        }
      } catch (itemError) {
        console.error(`     ❌ Error parsing item:`, itemError.message);
      }
    }
    
    console.log(`✅ ${sourceName}: ${articles.length} articles extraits\n`);
    return articles;
    
  } catch (error) {
    console.error(`💥 EXCEPTION pour ${sourceName}:`);
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack?.substring(0, 200)}`);
    return [];
  }
}

function extractTag(xml: string, tagName: string): string {
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
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
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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
    
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║       MILITARY RSS FEED AGGREGATOR            ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`🔍 Query: "${query}"`);
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📡 Feeds: ${MILITARY_RSS_FEEDS.length}`);
    console.log('');

    // Fetch from all RSS feeds sequentially (pour avoir des logs clairs)
    const allArticles: any[] = [];
    
    for (const feed of MILITARY_RSS_FEEDS) {
      const articles = await parseRSSFeed(feed.url, feed.name);
      allArticles.push(...articles);
    }

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log(`║  TOTAL BRUT: ${allArticles.length.toString().padStart(3)} articles                       ║`);
    console.log('╚═══════════════════════════════════════════════╝');

    // Filter by query if provided
    let filteredArticles = allArticles;
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
      console.log(`🔍 Filtrage avec: ${searchTerms.join(', ')}`);
      
      const beforeFilter = allArticles.length;
      filteredArticles = allArticles.filter(article => {
        const searchableText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        const matches = searchTerms.some((term: string) => searchableText.includes(term));
        return matches;
      });
      
      console.log(`📊 Filtré: ${beforeFilter} → ${filteredArticles.length} articles`);
    }

    // Sort by date
    filteredArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log(`║  ✅ RETOUR FINAL: ${filteredArticles.length.toString().padStart(3)} articles               ║`);
    console.log('╚═══════════════════════════════════════════════╝\n');

    if (filteredArticles.length > 0) {
      console.log('📌 Premiers articles:');
      filteredArticles.slice(0, 3).forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.title.substring(0, 60)}...`);
      });
    }

    return new Response(
      JSON.stringify({ 
        articles: filteredArticles,
        totalResults: filteredArticles.length,
        sources: MILITARY_RSS_FEEDS.map(f => f.name),
        debug: {
          totalFetched: allArticles.length,
          filtered: filteredArticles.length,
          query: query || 'none',
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════╗');
    console.error('║  💥 ERREUR FATALE                             ║');
    console.error('╚═══════════════════════════════════════════════╝');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        articles: [],
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// supabase/functions/fetch-military-rss/index.ts
// MISE À JOUR : Combine RSS natifs + scraping des sites sans RSS

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sites avec flux RSS natifs
const RSS_FEEDS = [
  {
    name: 'Analisi Difesa',
    url: 'https://www.analisidifesa.it/feed/',
    type: 'rss',
  },
  {
    name: 'Difesa Online',
    url: 'https://www.difesaonline.it/rss.xml',
    type: 'rss',
  },
  {
    name: 'Rivista Italiana Difesa',
    url: 'https://www.rid.it/feed/',
    type: 'rss',
  },
];

// Sites SANS RSS - à scraper
const SCRAPER_SITES = {
  'ares-difesa': {
    name: 'Ares Difesa',
    url: 'https://www.aresdifesa.it/',
    selector: 'article.post',
    titleSelector: 'h2.entry-title a',
    linkSelector: 'h2.entry-title a',
    dateSelector: 'time.entry-date',
    descriptionSelector: 'div.entry-summary',
  },
  'aviation-report': {
    name: 'Aviation Report',
    url: 'https://www.aviation-report.com/',
    selector: 'article',
    titleSelector: 'h2.entry-title a',
    linkSelector: 'h2.entry-title a',
    dateSelector: 'time.published',
    descriptionSelector: 'div.entry-content',
  },
  'starmag': {
    name: 'StarMag',
    url: 'https://www.starmag.it/categoria/defense/',
    selector: 'article.post',
    titleSelector: 'h2 a',
    linkSelector: 'h2 a',
    dateSelector: 'time',
    descriptionSelector: 'div.excerpt',
  },
  'report-difesa': {
    name: 'Report Difesa',
    url: 'https://www.reportdifesa.it/',
    selector: 'div.post-item',
    titleSelector: 'h3.post-title a',
    linkSelector: 'h3.post-title a',
    dateSelector: 'span.post-date',
    descriptionSelector: 'div.post-excerpt',
  },
  'infodifesa': {
    name: 'Info Difesa',
    url: 'https://www.infodifesa.it/',
    selector: 'article.post',
    titleSelector: 'h2.entry-title a',
    linkSelector: 'h2.entry-title a',
    dateSelector: 'time.entry-date',
    descriptionSelector: 'div.entry-summary',
  },
  // Sites institutionnels
  'ministero-difesa': {
    name: 'Ministero della Difesa',
    url: 'https://www.difesa.it/Primo_Piano/Pagine/default.aspx',
    selector: 'div.ms-rtestate-field',
    titleSelector: 'a',
    linkSelector: 'a',
    dateSelector: 'div.ms-listlink',
    descriptionSelector: 'div.ms-rtestate-field',
  },
  'stato-maggiore': {
    name: 'Stato Maggiore Difesa',
    url: 'https://www.difesa.it/SMD_/Staff/Ufficio_Pubblica_Informazione_e_Comunicazione/Pagine/News.aspx',
    selector: 'div.ms-itmhover',
    titleSelector: 'a',
    linkSelector: 'a',
    dateSelector: 'td.ms-vb2',
    descriptionSelector: 'div.ms-rtestate-field',
  },
  'esercito': {
    name: 'Esercito Italiano',
    url: 'https://www.esercito.difesa.it/comunicazione/Pagine/Notizie.aspx',
    selector: 'div.ms-rtestate-field',
    titleSelector: 'strong a',
    linkSelector: 'strong a',
    dateSelector: 'em',
    descriptionSelector: 'p',
  },
  'aeronautica': {
    name: 'Aeronautica Militare',
    url: 'https://www.aeronautica.difesa.it/Pagine/default.aspx',
    selector: 'div.notizia',
    titleSelector: 'h3 a',
    linkSelector: 'h3 a',
    dateSelector: 'span.data',
    descriptionSelector: 'div.abstract',
  },
  'marina': {
    name: 'Marina Militare',
    url: 'https://www.marina.difesa.it/media-cultura/notiziario/Pagine/default.aspx',
    selector: 'div.ms-rtestate-field',
    titleSelector: 'a',
    linkSelector: 'a',
    dateSelector: 'span',
    descriptionSelector: 'p',
  },
  'direzione-armamenti': {
    name: 'Direzione Nazionale Armamenti',
    url: 'https://www.difesa.it/DNA/Pagine/default.aspx',
    selector: 'div.news-item',
    titleSelector: 'h4 a',
    linkSelector: 'h4 a',
    dateSelector: 'span.date',
    descriptionSelector: 'div.description',
  },
};

// Parser RSS
async function parseRSSFeed(feedUrl: string, sourceName: string) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'AMBOS-Military-RSS-Scraper/1.0',
      },
    });
    if (!response.ok) {
      console.error(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    if (!doc) return [];

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
          description: description.replace(/<[^>]*>/g, ''),
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: { name: sourceName, language: 'it', type: 'rss' },
          author: creator,
          content: description.replace(/<[^>]*>/g, ''),
          military: true,
        });
      }
    }

    console.log(`RSS: ${articles.length} articles from ${sourceName}`);
    return articles;
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

// Web Scraper
async function scrapeSite(siteKey: string, config: any) {
  try {
    console.log(`Scraping ${config.name}...`);
    
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`Failed ${config.name}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (!doc) return [];

    const items = doc.querySelectorAll(config.selector);
    const articles: any[] = [];

    for (const item of items) {
      try {
        const el = item as any;
        
        const titleEl = config.titleSelector ? el.querySelector(config.titleSelector) : el;
        const title = titleEl?.textContent?.trim() || '';

        const linkEl = config.linkSelector ? el.querySelector(config.linkSelector) : el.querySelector('a');
        let link = linkEl?.getAttribute('href') || '';
        if (link && !link.startsWith('http')) {
          const base = new URL(config.url);
          link = new URL(link, base.origin).toString();
        }

        const dateEl = config.dateSelector ? el.querySelector(config.dateSelector) : null;
        const dateText = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';
        const pubDate = parseItalianDate(dateText) || new Date().toISOString();

        const descEl = config.descriptionSelector ? el.querySelector(config.descriptionSelector) : null;
        const description = descEl?.textContent?.trim() || '';

        if (title && link) {
          articles.push({
            title: title.substring(0, 200),
            description: description.substring(0, 500),
            url: link,
            publishedAt: pubDate,
            source: { name: config.name, language: 'it', type: 'scraper' },
            author: config.name,
            content: description,
            military: true,
            scraper: siteKey,
          });
        }
      } catch (e) {
        console.error(`Item error in ${config.name}:`, e);
      }
    }

    console.log(`Scraper: ${articles.length} articles from ${config.name}`);
    return articles;
  } catch (error) {
    console.error(`Scraper error ${config.name}:`, error);
    return [];
  }
}

function parseItalianDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const monthMap: Record<string, string> = {
    'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
    'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
    'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12',
  };

  try {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateStr).toISOString();
    }

    const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
    }

    const italianMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (italianMatch) {
      const [, day, monthName, year] = italianMatch;
      const month = monthMap[monthName];
      if (month) {
        return new Date(`${year}-${month}-${day.padStart(2, '0')}`).toISOString();
      }
    }

    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Fetching Italian military sources (RSS + Scraping)...');

    // Paralléliser RSS + Scraping
    const rssPromises = RSS_FEEDS.map(feed => parseRSSFeed(feed.url, feed.name));
    const scraperPromises = Object.entries(SCRAPER_SITES).map(([key, config]) => 
      scrapeSite(key, config)
    );

    const [rssResults, scraperResults] = await Promise.all([
      Promise.all(rssPromises),
      Promise.all(scraperPromises),
    ]);

    let allArticles = [...rssResults.flat(), ...scraperResults.flat()];

    // Filter by query
    if (query && query.trim()) {
      const terms = query.toLowerCase().split(' ');
      allArticles = allArticles.filter(article => {
        const text = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        return terms.some((term: string) => text.includes(term));
      });
    }

    // Sort by date
    allArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // Deduplicate by URL
    const seen = new Set();
    allArticles = allArticles.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });

    console.log(`Total: ${allArticles.length} articles (RSS + Scraped)`);

    return new Response(
      JSON.stringify({ articles: allArticles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', articles: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

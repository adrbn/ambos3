import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Retry utility with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Request failed, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles, query, language = 'en', sourceType = 'news' } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    console.log(`Analyzing ${articles.length} articles for query: ${query} (sourceType: ${sourceType})`);

    // Determine platforms to adjust analysis mode
    const toLower = (v: any) => typeof v === 'string' ? v.toLowerCase() : '';
    const getPlatform = (a: any) =>
      toLower(a.platform) ||
      toLower((a as any).osint?.platform) ||
      toLower(a.source?.platform) ||
      (toLower(a.source?.name || '').includes('twitter') ? 'twitter' : '');
    const platforms: string[] = Array.isArray(articles) ? articles.map(getPlatform) : [];
    const webLike = new Set(['web', 'google', 'google_search', 'serp']);
    const socialLike = new Set(['twitter', 'x', 'bluesky', 'bsky', 'mastodon', 'reddit']);
    const webCount = platforms.filter(p => webLike.has(p)).length;
    const socialCount = platforms.filter(p => socialLike.has(p)).length;
    const totalCount = Array.isArray(articles) ? articles.length : 0;
    const hasOnlyWeb = webCount > 0 && socialCount === 0 && webCount === totalCount;
    const hasSocial = socialCount > 0;
    const hasWeb = webCount > 0;
    const hasMixedSources = hasWeb && hasSocial;

    // System prompts
    const systemPrompts = {
      osintSocial: {
        en: `You are an OSINT analyst specializing in social media intelligence and weak signal detection. These are SOCIAL MEDIA posts (BlueSky, Mastodon, X/Twitter, Reddit) — NOT verified news sources. Focus on: community pulse (mood), emerging/dissonant narratives, significant divergences/convergences, weak signals, credibility and volatility. For PREDICTIONS: base them on REALISTIC probabilities considering historical patterns, geopolitical context, and expert consensus. Answer in English.`,
        fr: `Vous êtes un analyste OSINT spécialisé dans la veille sur les réseaux sociaux pour identifier des signaux faibles. Ce sont des posts de RÉSEAUX SOCIAUX — NON des sources journalistiques vérifiées. Focus: pouls communautaire (mood), récits émergents/dissonants, divergences/convergences significatives, signaux faibles, crédibilité et volatilité. Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français.`,
        it: `Sei un analista OSINT specializzato in social media e individuazione di segnali deboli. Post dei SOCIAL — NON fonti giornalistiche verificate. Focus: polso comunità, narrazioni emergenti/dissonanti, divergenze/convergenze, segnali deboli, credibilità e volatilità. Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano.`
      },
      press: {
        en: 'You are an intelligence analyst for verified press/media articles. Provide factual, concise, comprehensive synthesis. Focus on key facts, recent developments, main actors, and context. Answer in English.',
        fr: 'Vous êtes analyste de renseignement pour articles de presse vérifiés. Fournissez une synthèse factuelle, concise et complète. Focus sur faits clés, développements récents, acteurs principaux et contexte. Répondez en français.',
        it: 'Sei un analista di intelligence per articoli di stampa verificati. Fornisci sintesi fattuale, concisa e completa. Focus su fatti chiave, sviluppi recenti, attori principali e contesto. Rispondi in italiano.'
      },
      webSerp: {
        en: 'You are an analyst for WEB SEARCH results (NOT social media). Provide objective structured analysis. NO human sentiment inference. Focus on facts, mechanisms, milestones, and central themes. Answer in English.',
        fr: 'Vous êtes analyste de résultats de RECHERCHE WEB (NON réseaux sociaux). Fournissez analyse structurée objective. AUCUNE inférence de sentiment humain. Focus sur faits, mécanismes, jalons et thèmes centraux. Répondez en français.',
        it: 'Sei un analista di risultati di RICERCA WEB (NON social media). Fornisci analisi strutturata oggettiva. NESSUNA inferenza di sentiment umano. Focus su fatti, meccanismi, pietre miliari e temi centrali. Rispondi in italiano.'
      },
      mixed: {
        en: 'You are an analyst for MIXED results (web search + social media). Web results are fact-based; social posts show community sentiment. NO human sentiment inference for web sources. Distinguish source types clearly. Answer in English.',
        fr: 'Vous êtes analyste de résultats MIXTES (recherche web + réseaux sociaux). Résultats web factuels ; posts sociaux montrent sentiment communautaire. AUCUNE inférence de sentiment humain pour sources web. Distinguez clairement types de sources. Répondez en français.',
        it: 'Sei un analista di risultati MISTI (ricerca web + social media). Risultati web fattuali; post social mostrano sentiment comunitario. NESSUNA inferenza di sentiment umano per fonti web. Distingui chiaramente i tipi di fonte. Rispondi in italiano.'
      }
    };

    let selectedSystem = systemPrompts.press;
    if (sourceType === 'osint' || sourceType === 'social') {
      if (hasMixedSources) {
        selectedSystem = systemPrompts.mixed;
      } else if (hasOnlyWeb) {
        selectedSystem = systemPrompts.webSerp;
      } else if (hasSocial) {
        selectedSystem = systemPrompts.osintSocial;
      }
    } else if (sourceType === 'military') {
      selectedSystem = systemPrompts.press;
    }

    // Tool definition for batch analysis
    const batchAnalysisTool = {
      type: "function",
      function: {
        name: "analyze_batch",
        description: "Analyze a batch of articles",
        parameters: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  role: { type: "string" }
                }
              }
            },
            key_points: { 
              type: "array",
              items: { type: "string" }
            },
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event: { type: "string" },
                  probability: { type: "string" },
                  timeframe: { type: "string" },
                  confidence_factors: { type: "array", items: { type: "string" } },
                  risk_level: { type: "string" }
                }
              }
            },
            sentiment: { type: "string" }
          },
          required: ["entities", "key_points", "predictions", "sentiment"]
        }
      }
    };

    // Batch processing: divide articles into groups of 12
    const BATCH_SIZE = 12;
    const articleBatches: any[][] = [];
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      articleBatches.push(articles.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing in ${articleBatches.length} batches of max ${BATCH_SIZE} articles`);

    // Analyze each batch with delay to respect rate limits
    const batchResults = [];
    for (let i = 0; i < articleBatches.length; i++) {
      const batch = articleBatches[i];
      console.log(`Analyzing batch ${i + 1}/${articleBatches.length} (${batch.length} articles)`);

      // Add delay between batches to respect Groq rate limits (except for first batch)
      if (i > 0) {
        console.log('Waiting 2 seconds before next batch to respect rate limits...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const userContent = `Query: "${query}"\n\nArticles:\n${batch.map((article: any, idx: number) => {
        const title = article.title || 'No title';
        const source = article.source?.name || article.platform || 'Unknown';
        const description = article.description || article.content || 'No description';
        return `${idx + 1}. [${source}] ${title}\n${description}`;
      }).join('\n\n')}`;

      const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: selectedSystem[language as keyof typeof selectedSystem] || selectedSystem.en },
            { role: 'user', content: userContent }
          ],
          tools: [batchAnalysisTool],
          tool_choice: { type: "function", function: { name: "analyze_batch" } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Groq API error on batch ${i + 1}:`, response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Groq rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'analyze_batch') {
        console.error('No valid tool call in batch response');
        throw new Error('AI did not use the expected tool for batch analysis');
      }

      const batchAnalysis = JSON.parse(toolCall.function.arguments);
      batchResults.push(batchAnalysis);
      console.log(`Batch ${i + 1} analyzed successfully`);
    }

    // Merge batch results directly instead of asking AI to synthesize
    console.log('Merging batch results...');

    // Deduplicate and merge entities
    const entitiesMap = new Map<string, any>();
    batchResults.forEach(batch => {
      batch.entities.forEach((entity: any) => {
        if (!entitiesMap.has(entity.name)) {
          entitiesMap.set(entity.name, entity);
        }
      });
    });

    // Merge predictions (keep all unique predictions)
    const allPredictions: any[] = [];
    batchResults.forEach(batch => {
      batch.predictions.forEach((pred: any) => {
        // Avoid duplicates based on event text
        if (!allPredictions.some(p => p.event === pred.event)) {
          allPredictions.push(pred);
        }
      });
    });

    // Combine key points into a summary
    const allKeyPoints = batchResults.flatMap((r: any) => r.key_points);
    const summary = allKeyPoints.join('. ') + '.';

    // Aggregate sentiment (majority vote)
    const sentiments = batchResults.map((r: any) => r.sentiment);
    const sentimentCounts: Record<string, number> = {};
    sentiments.forEach(s => {
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
    });
    const dominantSentiment = Object.entries(sentimentCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    const analysis = {
      entities: Array.from(entitiesMap.values()),
      summary,
      predictions: allPredictions,
      sentiment: dominantSentiment
    };

    console.log('Final analysis merged successfully');


    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-news function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

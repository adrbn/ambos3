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
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
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
        en: `You are an intelligence analyst specializing in verified news analysis and strategic trend detection. These are VERIFIED PRESS articles from established news organizations. Focus on: factual assessment, verified source credibility, editorial orientation, analytical depth, established patterns. For PREDICTIONS: base them on REALISTIC probabilities considering historical patterns, geopolitical context, and expert consensus. Answer in English.`,
        fr: `Vous êtes un analyste de renseignement spécialisé dans l'analyse de la presse vérifiée et la détection de tendances stratégiques. Articles de PRESSE VÉRIFIÉE. Focus: évaluation factuelle, crédibilité des sources vérifiées, orientation éditoriale, profondeur analytique, schémas établis. Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français.`,
        it: `Sei un analista di intelligence specializzato in analisi stampa verificata e rilevamento tendenze strategiche. Articoli di STAMPA VERIFICATA. Focus: valutazione fattuale, credibilità fonti verificate, orientamento editoriale, profondità analitica, schemi consolidati. Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano.`
      },
      mixed: {
        en: `You are a strategic intelligence analyst specializing in multi-source intelligence fusion. You are analyzing a MIX of verified press articles AND social media posts. Clearly differentiate: (1) VERIFIED PRESS: factual reporting, editorial orientation, credibility assessment (2) SOCIAL MEDIA: community sentiment, emerging narratives, weak signals, volatility. For PREDICTIONS: base them on REALISTIC probabilities. Answer in English.`,
        fr: `Vous êtes un analyste de renseignement stratégique spécialisé dans la fusion multi-sources. Vous analysez un MÉLANGE d'articles de presse vérifiée ET de posts réseaux sociaux. Distinguez: (1) PRESSE VÉRIFIÉE: reporting factuel, orientation éditoriale, évaluation crédibilité (2) RÉSEAUX SOCIAUX: sentiment communautaire, récits émergents, signaux faibles, volatilité. Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français.`,
        it: `Sei un analista di intelligence strategica specializzato in fusione multi-fonte. Analizzi un MIX di articoli stampa verificata E post social. Distingui: (1) STAMPA VERIFICATA: reporting fattuale, orientamento editoriale, valutazione credibilità (2) SOCIAL MEDIA: sentiment comunità, narrazioni emergenti, segnali deboli, volatilità. Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano.`
      }
    };

    // Determine prompt based on mixed analysis
    let systemPrompt: string;
    if (hasMixedSources) {
      systemPrompt = systemPrompts.mixed[language as keyof typeof systemPrompts.mixed] || systemPrompts.mixed.en;
    } else if (hasSocial || sourceType === 'osint') {
      systemPrompt = systemPrompts.osintSocial[language as keyof typeof systemPrompts.osintSocial] || systemPrompts.osintSocial.en;
    } else {
      systemPrompt = systemPrompts.press[language as keyof typeof systemPrompts.press] || systemPrompts.press.en;
    }

    // Define the batch analysis tool with enhanced predictions structure
    const batchAnalysisTool = {
      name: 'batch_news_analysis',
      description: 'Analyze a batch of articles and provide comprehensive intelligence assessment',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Comprehensive intelligence summary' },
          key_points: {
            type: 'array',
            items: { type: 'string' },
            description: 'Critical strategic insights'
          },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['person', 'organization', 'location', 'event'] },
                relevance: { type: 'string' }
              },
              required: ['name', 'type', 'relevance']
            },
            description: 'Key entities identified'
          },
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                prediction: { type: 'string', description: 'Specific prediction statement' },
                probability: { type: 'number', description: 'Realistic probability (0-100) based on analysis' },
                timeframe: { type: 'string', description: 'Realistic timeframe (e.g., "1-3 months", "6-12 months")' },
                confidence_factors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Factors affecting confidence in this prediction'
                },
                risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Risk assessment level' }
              },
              required: ['prediction', 'probability', 'timeframe', 'confidence_factors', 'risk_level']
            },
            description: 'Strategic predictions with realistic probability assessment'
          },
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'], description: 'Dominant sentiment' }
        },
        required: ['summary', 'key_points', 'entities', 'predictions', 'sentiment']
      }
    };

    // Batch processing: divide articles into groups of 6 to reduce TPM load
    const BATCH_SIZE = 6;
    const articleBatches: any[][] = [];
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      articleBatches.push(articles.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${articleBatches.length} batches of ${BATCH_SIZE} articles each...`);

    const partialResults: any[] = [];

    for (let i = 0; i < articleBatches.length; i++) {
      const batch = articleBatches[i];
      console.log(`Processing batch ${i + 1}/${articleBatches.length} (${batch.length} articles)...`);

      // Add delay between batches to respect Gemini rate limits (except for first batch)
      if (i > 0) {
        console.log('Waiting 3 seconds before next batch to respect rate limits...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const userContent = `Query: "${query}"\n\nArticles:\n${batch.map((article: any, idx: number) => {
        const platform = getPlatform(article);
        const sourceLabel = platform ? ` [${platform.toUpperCase()}]` : '';
        return `Article ${idx + 1}${sourceLabel}:\nTitle: ${article.title}\nDescription: ${article.description || 'N/A'}\nSource: ${article.source?.name || 'Unknown'}`;
      }).join('\n\n')}`;

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt + '\n\n' + userContent }]
              }
            ],
            tools: [
              {
                functionDeclarations: [batchAnalysisTool]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4000,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Gemini rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log(`Batch ${i + 1} response received`);

      // Extract analysis from function call
      if (data.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
        const functionCall = data.candidates[0].content.parts[0].functionCall;
        if (functionCall.name === 'batch_news_analysis' && functionCall.args) {
          partialResults.push(functionCall.args);
        }
      }
    }

    console.log(`All batches processed. Synthesizing ${partialResults.length} partial results...`);

    // Merge all partial results
    const mergedResult = {
      summary: partialResults.map(r => r.summary).join('\n\n'),
      key_points: partialResults.flatMap(r => r.key_points || []),
      entities: partialResults.flatMap(r => r.entities || []),
      predictions: partialResults.flatMap(r => r.predictions || []),
      sentiment: determineDominantSentiment(partialResults.map(r => r.sentiment))
    };

    return new Response(
      JSON.stringify(mergedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing articles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function determineDominantSentiment(sentiments: string[]): string {
  const counts: Record<string, number> = {};
  sentiments.forEach(s => {
    counts[s] = (counts[s] || 0) + 1;
  });
  
  let maxCount = 0;
  let dominant = 'neutral';
  for (const [sentiment, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = sentiment;
    }
  }
  
  return dominant;
}

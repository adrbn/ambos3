import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Enhanced retry with exponential backoff for 503 and 429 errors
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If overloaded (503) or rate limited (429), wait and retry with exponential backoff
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s, 16s, 32s
        console.log(`API ${response.status} error, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const waitTime = Math.pow(2, attempt) * 2000;
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
        en: `You are an OSINT analyst specializing in social media intelligence and weak signal detection. These are SOCIAL MEDIA posts (BlueSky, Mastodon, X/Twitter, Reddit) — NOT verified news sources.

CRITICAL REQUIREMENTS FOR SUMMARY:
- Extract SPECIFIC details from posts: usernames, exact quotes, timestamps, hashtags trending
- Identify CONCRETE emerging narratives with examples from actual posts
- Report SPECIFIC divergences between communities (quote conflicting posts)
- List PRECISE weak signals with source references
- Assess credibility BY POST (not generically)

Focus on: community pulse (mood), emerging/dissonant narratives, significant divergences/convergences, weak signals, credibility and volatility. For PREDICTIONS: base them on REALISTIC probabilities considering historical patterns, geopolitical context, and expert consensus. Answer in English.`,
        fr: `Vous êtes un analyste OSINT spécialisé dans la veille sur les réseaux sociaux pour identifier des signaux faibles. Ce sont des posts de RÉSEAUX SOCIAUX — NON des sources journalistiques vérifiées.

EXIGENCES CRITIQUES POUR LE RÉSUMÉ:
- Extrayez des détails SPÉCIFIQUES des posts: noms d'utilisateurs, citations exactes, timestamps, hashtags tendances
- Identifiez les récits émergents CONCRETS avec exemples de posts réels
- Rapportez les divergences PRÉCISES entre communautés (citez les posts contradictoires)
- Listez les signaux faibles PRÉCIS avec références aux sources
- Évaluez la crédibilité POST PAR POST (pas de manière générique)

Focus: pouls communautaire (mood), récits émergents/dissonants, divergences/convergences significatives, signaux faibles, crédibilité et volatilité. Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français.`,
        it: `Sei un analista OSINT specializzato in social media e individuazione di segnali deboli. Post dei SOCIAL — NON fonti giornalistiche verificate.

REQUISITI CRITICI PER IL RIASSUNTO:
- Estrai dettagli SPECIFICI dai post: username, citazioni esatte, timestamp, hashtag di tendenza
- Identifica narrazioni emergenti CONCRETE con esempi da post reali
- Riporta divergenze PRECISE tra comunità (cita post contraddittori)
- Elenca segnali deboli PRECISI con riferimenti alle fonti
- Valuta credibilità POST PER POST (non genericamente)

Focus: polso comunità, narrazioni emergenti/dissonanti, divergenze/convergenze, segnali deboli, credibilità e volatilità. Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano.`
      },
      press: {
        en: `You are an intelligence analyst specializing in verified news analysis and strategic trend detection. These are VERIFIED PRESS articles from established news organizations.

CRITICAL REQUIREMENTS FOR SUMMARY:
- Extract SPECIFIC FACTS from each article: exact dates, names of people/organizations, precise locations, numerical data, quotes
- Reference articles BY NAME when discussing specific information (e.g., "According to [Source Name], on [Date]...")
- Report CONCRETE developments, not vague trends (e.g., "France announced deployment of 50 units to X region on DATE" NOT "military modernization continues")
- Include DETAILED CONTEXT: why it matters, who is involved, what changed specifically
- List PRECISE key points with article references, not abstract observations
- Identify FACTUAL contradictions or confirmations between sources with explicit source citations

For PREDICTIONS: base them on REALISTIC probabilities considering historical patterns, geopolitical context, and expert consensus. Answer in English with CONCRETE details from the articles.`,
        fr: `Vous êtes un analyste de renseignement spécialisé dans l'analyse de la presse vérifiée et la détection de tendances stratégiques. Articles de PRESSE VÉRIFIÉE.

EXIGENCES CRITIQUES POUR LE RÉSUMÉ:
- Extrayez des FAITS PRÉCIS de chaque article: dates exactes, noms de personnes/organisations, lieux précis, données chiffrées, citations
- Référencez les articles PAR NOM quand vous discutez d'informations spécifiques (ex: "D'après [Nom Source], le [Date]...")
- Rapportez des développements CONCRETS, pas des tendances vagues (ex: "La France a annoncé le déploiement de 50 unités en région X le DATE" NON "la modernisation militaire continue")
- Incluez le CONTEXTE DÉTAILLÉ: pourquoi c'est important, qui est impliqué, ce qui a changé spécifiquement
- Listez des points clés PRÉCIS avec références aux articles, pas d'observations abstraites
- Identifiez les contradictions ou confirmations FACTUELLES entre sources avec citations explicites

Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français avec des détails CONCRETS des articles.`,
        it: `Sei un analista di intelligence specializzato in analisi stampa verificata e rilevamento tendenze strategiche. Articoli di STAMPA VERIFICATA.

REQUISITI CRITICI PER IL RIASSUNTO:
- Estrai FATTI PRECISI da ogni articolo: date esatte, nomi di persone/organizzazioni, luoghi precisi, dati numerici, citazioni
- Riferisci gli articoli PER NOME quando discuti informazioni specifiche (es: "Secondo [Nome Fonte], il [Data]...")
- Riporta sviluppi CONCRETI, non tendenze vaghe (es: "La Francia ha annunciato dispiegamento di 50 unità in regione X il DATA" NON "la modernizzazione militare continua")
- Includi CONTESTO DETTAGLIATO: perché è importante, chi è coinvolto, cosa è cambiato specificatamente
- Elenca punti chiave PRECISI con riferimenti agli articoli, non osservazioni astratte
- Identifica contraddizioni o conferme FATTUALI tra fonti con citazioni esplicite

Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano con dettagli CONCRETI dagli articoli.`
      },
      mixed: {
        en: `You are a strategic intelligence analyst specializing in multi-source intelligence fusion. You are analyzing a MIX of verified press articles AND social media posts.

CRITICAL REQUIREMENTS:
- Clearly differentiate and REFERENCE each source type when presenting information
- (1) VERIFIED PRESS: Extract SPECIFIC facts (dates, names, numbers, locations) with article source names
- (2) SOCIAL MEDIA: Report SPECIFIC posts (usernames, quotes, timestamps) showing community sentiment
- Cross-reference: Where do press reports CONFIRM or CONTRADICT social media narratives? Be SPECIFIC with examples
- Identify information gaps: What does press report that social ignores? What signals does social show that press hasn't covered?

For PREDICTIONS: base them on REALISTIC probabilities. Answer in English with CONCRETE source-attributed details.`,
        fr: `Vous êtes un analyste de renseignement stratégique spécialisé dans la fusion multi-sources. Vous analysez un MÉLANGE d'articles de presse vérifiée ET de posts réseaux sociaux.

EXIGENCES CRITIQUES:
- Distinguez clairement et RÉFÉRENCEZ chaque type de source lors de la présentation d'informations
- (1) PRESSE VÉRIFIÉE: Extrayez des faits SPÉCIFIQUES (dates, noms, chiffres, lieux) avec noms des sources articles
- (2) RÉSEAUX SOCIAUX: Rapportez des posts SPÉCIFIQUES (usernames, citations, timestamps) montrant le sentiment communautaire
- Recoupement: Où les rapports presse CONFIRMENT ou CONTREDISENT les récits des réseaux sociaux? Soyez PRÉCIS avec exemples
- Identifiez les lacunes d'information: Que rapporte la presse que les réseaux ignorent? Quels signaux les réseaux montrent que la presse n'a pas couvert?

Pour les PRÉDICTIONS: probabilités RÉALISTES. Répondez en français avec détails CONCRETS attribués aux sources.`,
        it: `Sei un analista di intelligence strategica specializzato in fusione multi-fonte. Analizzi un MIX di articoli stampa verificata E post social.

REQUISITI CRITICI:
- Distingui chiaramente e RIFERISCI ogni tipo di fonte quando presenti informazioni
- (1) STAMPA VERIFICATA: Estrai fatti SPECIFICI (date, nomi, numeri, luoghi) con nomi fonti articoli
- (2) SOCIAL MEDIA: Riporta post SPECIFICI (username, citazioni, timestamp) mostrando sentiment comunità
- Incrocio: Dove i report stampa CONFERMANO o CONTRADDICONO le narrative social? Sii SPECIFICO con esempi
- Identifica gap informativi: Cosa riporta la stampa che i social ignorano? Quali segnali mostrano i social che la stampa non ha coperto?

Per le PREVISIONI: probabilità REALISTICHE. Rispondi in italiano con dettagli CONCRETI attribuiti alle fonti.`
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

    // Batch processing: divide articles into groups of 10 for better performance
    const BATCH_SIZE = 10;
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
        console.log('Waiting 1 second before next batch to respect rate limits...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const userContent = `Query: "${query}"\n\nArticles:\n${batch.map((article: any, idx: number) => {
        const platform = getPlatform(article);
        const sourceLabel = platform ? ` [${platform.toUpperCase()}]` : '';
        const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue';
        const content = article.content ? article.content.substring(0, 800) : article.description || '';
        return `Article ${idx + 1}${sourceLabel}:
Title: ${article.title}
Source: ${article.source?.name || 'Unknown'}
Date: ${date}
URL: ${article.url || 'N/A'}
Content: ${content}`;
      }).join('\n\n')}`;

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

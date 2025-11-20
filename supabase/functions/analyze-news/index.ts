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
        en: `You are an OSINT analyst. These are SOCIAL MEDIA posts.

CRITICAL OUTPUT FORMAT:
- Summary: 2-3 SHORT sentences with main trends (NO details, NO names, NO dates in summary)
- Key Points: 5-8 SHORT bullet points stating WHAT happened (keep concise, 1 sentence max each)
- Each key point MUST have separate "details" field with: specific source names, exact dates, precise quotes, usernames, hashtags

Example Key Point:
Point: "Growing concern about privacy legislation"
Details: "@user123 on Nov 15: 'New EU directive leaked', #PrivacyRights trending with 50K posts, contradicted by @govofficial 'no legislation planned'"

Answer in English.`,
        fr: `Vous êtes un analyste OSINT. Posts RÉSEAUX SOCIAUX.

FORMAT DE SORTIE CRITIQUE:
- Résumé: 2-3 phrases COURTES avec tendances principales (PAS de détails, PAS de noms, PAS de dates dans le résumé)
- Points clés: 5-8 points COURTS indiquant CE QUI s'est passé (concis, 1 phrase max chacun)
- Chaque point clé DOIT avoir un champ "details" séparé avec: noms sources précis, dates exactes, citations précises, usernames, hashtags

Exemple Point Clé:
Point: "Inquiétudes croissantes sur législation vie privée"
Details: "@user123 le 15 nov: 'Nouvelle directive EU leaked', #PrivacyRights tendance avec 50K posts, contredit par @govofficial 'aucune législation prévue'"

Répondez en français.`,
        it: `Sei un analista OSINT. Post SOCIAL MEDIA.

FORMATO OUTPUT CRITICO:
- Riassunto: 2-3 frasi BREVI con tendenze principali (NIENTE dettagli, NIENTE nomi, NIENTE date nel riassunto)
- Punti chiave: 5-8 punti BREVI che dichiarano COSA è successo (conciso, max 1 frase ciascuno)
- Ogni punto chiave DEVE avere campo "details" separato con: nomi fonti precisi, date esatte, citazioni precise, username, hashtag

Esempio Punto Chiave:
Punto: "Preoccupazioni crescenti su legislazione privacy"
Details: "@user123 il 15 nov: 'Nuova direttiva EU leaked', #PrivacyRights trending con 50K post, contraddetto da @govofficial 'nessuna legislazione prevista'"

Rispondi in italiano.`
      },
      press: {
        en: `You are an intelligence analyst. VERIFIED PRESS articles.

CRITICAL OUTPUT FORMAT:
- Summary: 2-3 SHORT sentences with main developments (NO details, NO specific names/dates in summary - keep it high-level)
- Key Points: 5-8 SHORT statements of WHAT happened (concise, 1 sentence each, NO details)
- Each key point MUST have separate "details" field with: exact source names, precise dates, specific numbers, locations, full context

Example Key Point:
Point: "Major defense contract awarded for drone systems"
Details: "According to Defense News (Nov 15, 2025), US Army awarded General Atomics $2.3B contract for 120 MQ-9 Reaper drones, delivery by Q3 2026, part of Pacific theater modernization program"

Answer in English.`,
        fr: `Vous êtes un analyste de renseignement. Articles PRESSE VÉRIFIÉE.

FORMAT DE SORTIE CRITIQUE:
- Résumé: 2-3 phrases COURTES avec développements principaux (PAS de détails, PAS de noms/dates spécifiques dans résumé - restez général)
- Points clés: 5-8 déclarations COURTES de CE QUI s'est passé (concis, 1 phrase chacun, PAS de détails)
- Chaque point clé DOIT avoir un champ "details" séparé avec: noms sources exacts, dates précises, chiffres spécifiques, lieux, contexte complet

Exemple Point Clé:
Point: "Contrat de défense majeur attribué pour systèmes de drones"
Details: "D'après Defense News (15 nov 2025), l'US Army a attribué à General Atomics un contrat de $2.3Mds pour 120 drones MQ-9 Reaper, livraison T3 2026, dans le cadre du programme de modernisation du théâtre Pacifique"

Répondez en français.`,
        it: `Sei un analista di intelligence. Articoli STAMPA VERIFICATA.

FORMATO OUTPUT CRITICO:
- Riassunto: 2-3 frasi BREVI con sviluppi principali (NIENTE dettagli, NIENTE nomi/date specifici nel riassunto - resta generale)
- Punti chiave: 5-8 dichiarazioni BREVI di COSA è successo (conciso, 1 frase ciascuno, NIENTE dettagli)
- Ogni punto chiave DEVE avere campo "details" separato con: nomi fonti esatti, date precise, numeri specifici, luoghi, contesto completo

Esempio Punto Chiave:
Punto: "Contratto difesa importante assegnato per sistemi droni"
Details: "Secondo Defense News (15 nov 2025), US Army ha assegnato a General Atomics contratto $2.3Mds per 120 droni MQ-9 Reaper, consegna Q3 2026, parte programma modernizzazione teatro Pacifico"

Rispondi in italiano.`
      },
      military: {
        en: `You are a military intelligence analyst analyzing SPECIALIZED DEFENSE RSS articles.

CRITICAL: Articles come from Italian defense publications with REAL procurement contracts, equipment specs, and military operations. Extract CONCRETE DETAILS directly from articles.

OUTPUT FORMAT:
- Summary: 2-3 sentences with main factual developments (mention specific programs/contracts by name if in articles)
- Key Points: 6-10 factual statements extracted from articles (1 sentence each)
- Each key point MUST have "details" field with: exact contract values from articles, specific equipment models, precise dates, manufacturer names, military units mentioned, operational context

Example from REAL article content:
Point: "Leonardo awarded major rotorcraft contract"
Details: "From Analisi Difesa (Dec 2, 2024): Italian MoD signed €450M contract with Leonardo Helicopters for 18 AW249 Fenice attack helicopters, delivery 2026-2028, assigned to 1° Reggimento 'Antares' at Viterbo. Contract includes integrated weapons systems and pilot training."

CRITICAL: Do NOT write generic summaries. Extract and cite specific facts from provided articles. If articles mention specific contract values, dates, equipment names - INCLUDE THEM in details.

Answer in English.`,
        fr: `Vous êtes analyste de renseignement militaire analysant des articles RSS DÉFENSE SPÉCIALISÉS.

CRITIQUE: Les articles proviennent de publications de défense italiennes avec de VRAIS contrats d'acquisition, spécifications d'équipement et opérations militaires. Extrayez des DÉTAILS CONCRETS directement des articles.

FORMAT DE SORTIE:
- Résumé: 2-3 phrases avec développements factuels principaux (mentionnez programmes/contrats spécifiques par nom si mentionnés)
- Points clés: 6-10 déclarations factuelles extraites des articles (1 phrase chacun)
- Chaque point clé DOIT avoir champ "details" avec: valeurs exactes contrats des articles, modèles d'équipement spécifiques, dates précises, noms fabricants, unités militaires mentionnées, contexte opérationnel

Exemple tiré du contenu d'article RÉEL:
Point: "Leonardo obtient important contrat hélicoptères"
Details: "D'après Analisi Difesa (2 déc 2024): MoD italien a signé contrat €450M avec Leonardo Helicopters pour 18 hélicoptères d'attaque AW249 Fenice, livraison 2026-2028, affectés au 1° Reggimento 'Antares' à Viterbo. Contrat inclut systèmes d'armes intégrés et formation pilotes."

CRITIQUE: N'écrivez PAS de résumés génériques. Extrayez et citez des faits spécifiques des articles fournis. Si articles mentionnent valeurs de contrats, dates, noms d'équipements - INCLUEZ-LES dans les détails.

Répondez en français.`,
        it: `Sei analista di intelligence militare che analizza articoli RSS DIFESA SPECIALIZZATI.

CRITICO: Gli articoli provengono da pubblicazioni difesa italiane con VERI contratti acquisizione, specifiche equipaggiamento e operazioni militari. Estrai DETTAGLI CONCRETI direttamente dagli articoli.

FORMATO OUTPUT:
- Riassunto: 2-3 frasi con sviluppi fattuali principali (menziona programmi/contratti specifici per nome se menzionati)
- Punti chiave: 6-10 dichiarazioni fattuali estratte dagli articoli (1 frase ciascuno)
- Ogni punto chiave DEVE avere campo "details" con: valori esatti contratti dagli articoli, modelli equipaggiamento specifici, date precise, nomi produttori, unità militari menzionate, contesto operativo

Esempio da contenuto articolo REALE:
Punto: "Leonardo ottiene importante contratto elicotteri"
Details: "Da Analisi Difesa (2 dic 2024): MoD italiano ha firmato contratto €450M con Leonardo Helicopters per 18 elicotteri d'attacco AW249 Fenice, consegna 2026-2028, assegnati al 1° Reggimento 'Antares' a Viterbo. Contratto include sistemi armi integrati e formazione piloti."

CRITICO: NON scrivere riassunti generici. Estrai e cita fatti specifici dagli articoli forniti. Se articoli menzionano valori contratti, date, nomi equipaggiamenti - INCLUDILI nei dettagli.

Rispondi in italiano.`
      },
      mixed: {
        en: `You are a strategic intelligence analyst. MIX of press AND social media.

CRITICAL OUTPUT FORMAT:
- Summary: 2-3 SHORT sentences (high-level only, NO details)
- Key Points: 5-8 SHORT statements (1 sentence each, NO details)
- Each key point MUST have "details" field with: press sources (names, dates, numbers) AND social signals (usernames, quotes, timestamps)

Answer in English.`,
        fr: `Vous êtes un analyste de renseignement stratégique. MÉLANGE presse ET réseaux sociaux.

FORMAT DE SORTIE CRITIQUE:
- Résumé: 2-3 phrases COURTES (niveau général uniquement, PAS de détails)
- Points clés: 5-8 déclarations COURTES (1 phrase chacun, PAS de détails)
- Chaque point clé DOIT avoir champ "details" avec: sources presse (noms, dates, chiffres) ET signaux sociaux (usernames, citations, timestamps)

Répondez en français.`,
        it: `Sei un analista di intelligence strategica. MIX stampa E social media.

FORMATO OUTPUT CRITICO:
- Riassunto: 2-3 frasi BREVI (solo livello generale, NIENTE dettagli)
- Punti chiave: 5-8 dichiarazioni BREVI (1 frase ciascuno, NIENTE dettagli)
- Ogni punto chiave DEVE avere campo "details" con: fonti stampa (nomi, date, numeri) E segnali social (username, citazioni, timestamp)

Rispondi in italiano.`
      }
    };

    // Determine prompt based on mixed analysis
    let systemPrompt: string;
    if (hasMixedSources) {
      systemPrompt = systemPrompts.mixed[language as keyof typeof systemPrompts.mixed] || systemPrompts.mixed.en;
    } else if (hasSocial || sourceType === 'osint') {
      systemPrompt = systemPrompts.osintSocial[language as keyof typeof systemPrompts.osintSocial] || systemPrompts.osintSocial.en;
    } else if (sourceType === 'military') {
      systemPrompt = systemPrompts.military[language as keyof typeof systemPrompts.military] || systemPrompts.military.en;
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
          summary: { type: 'string', description: '2-3 SHORT sentences with main trends ONLY (no specific details, names or dates)' },
          key_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point: { type: 'string', description: 'SHORT statement of what happened (1 sentence max, no details)' },
                details: { type: 'string', description: 'FULL details: specific sources, exact dates, precise numbers, quotes, context' }
              },
              required: ['point', 'details']
            },
            description: '5-8 key developments with separate concise point and detailed facts'
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
            description: '3-5 concrete future scenarios based on current article trends',
            items: {
              type: 'object',
              properties: {
                scenario: { 
                  type: 'string', 
                  description: 'Clear, specific predicted development (not vague trends)' 
                },
                probability: { 
                  type: 'string', 
                  enum: ['high', 'medium', 'low'], 
                  description: 'Realistic likelihood: high (70-90%), medium (40-70%), low (10-40%)' 
                },
                timeframe: { 
                  type: 'string', 
                  description: 'Realistic timeframe based on patterns (e.g., "2-4 months", "Q2 2025")' 
                },
                impact: { 
                  type: 'string', 
                  description: 'Concrete expected impact with specific affected areas/actors' 
                },
                reasoning: { 
                  type: 'string', 
                  description: 'Evidence-based reasoning citing article facts, trends, expert opinions' 
                },
                confidence_factors: { 
                  type: 'string', 
                  description: 'Specific factors from articles: expert consensus, historical precedent, budget allocation, policy announcements' 
                },
                risk_level: { 
                  type: 'string', 
                  enum: ['critical', 'high', 'moderate', 'low'], 
                  description: 'Risk severity: critical (strategic threat), high (major disruption), moderate (significant), low (minor)' 
                }
              },
              required: ['scenario', 'probability', 'timeframe', 'reasoning', 'confidence_factors', 'risk_level']
            }
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
        } else {
          console.error(`Unexpected function call name: ${functionCall.name || 'none'}`);
        }
      } else {
        // Log what we actually received to debug
        console.error('No function call in response. Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
        
        // Try to extract text response as fallback
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          console.log('Attempting to parse text response as JSON fallback');
          try {
            // Try to parse as JSON if it's wrapped in ```json code blocks
            let jsonText = textContent.trim();
            if (jsonText.startsWith('```json')) {
              jsonText = jsonText.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
            } else if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/```\n?/g, '').replace(/\n?```$/g, '');
            }
            const parsedResult = JSON.parse(jsonText);
            partialResults.push(parsedResult);
            console.log('Successfully parsed text response as JSON');
          } catch (parseError) {
            console.error('Failed to parse text response as JSON:', parseError);
          }
        }
      }
    }

    console.log(`All batches processed. Synthesizing ${partialResults.length} partial results...`);

    // If no results were obtained, return an error
    if (partialResults.length === 0) {
      console.error('No analysis results obtained from Gemini API');
      return new Response(
        JSON.stringify({ 
          error: 'Analysis failed: Gemini did not return valid results. Check function logs for details.',
          summary: '',
          key_points: [],
          entities: [],
          predictions: [],
          sentiment: 'neutral'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge all partial results
    const mergedResult = {
      summary: partialResults.length > 0 ? partialResults[0].summary : '',
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

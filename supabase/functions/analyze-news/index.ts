import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log(`Analyzing articles for query: ${query} (sourceType: ${sourceType})`);

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
        it: 'Sei un analista di risultati di RICERCA WEB (NON social media). Fornisci analisi strutturata obiettiva. NESSUNA inferenza di sentimento umano. Focus su fatti, meccanismi, pietre miliari e temi centrali. Rispondi in italiano.'
      }
    };

    let selectedSystem = systemPrompts.press;
    if (sourceType === 'osint') {
      if (hasOnlyWeb) {
        selectedSystem = systemPrompts.webSerp;
      } else if (hasSocial || hasMixedSources) {
        selectedSystem = systemPrompts.osintSocial;
      }
    }

    const articlesText = (Array.isArray(articles) ? articles : []).map((a: any, i: number) => {
      const baseInfo = `[${i+1}] ${a.title}\n${a.description}\nSource: ${a.source?.name || 'Unknown'}\nPublished: ${a.publishedAt}\nURL: ${a.url}`;
      const platform = toLower(a.platform) || toLower((a as any).osint?.platform) || toLower(a.source?.platform) || 'unknown';
      const engagement = (a as any).osint?.engagement || (a as any).engagement || {};
      const cred = (a as any).osint?.credibilityScore ?? (a as any).credibilityScore;
      if ((a as any).osint || platform !== 'unknown') {
        const osintInfo = `\nPlatform: ${platform}${cred !== undefined ? `\nCredibility Score: ${cred}/100` : ''}\nEngagement: ${engagement.likes || 0} likes, ${engagement.reposts || engagement.shares || 0} reposts, ${engagement.replies || engagement.comments || 0} replies`;
        return baseInfo + osintInfo;
      }
      return baseInfo;
    }).join('\n\n');

    const label = sourceType === 'osint'
      ? (hasOnlyWeb ? `WEB SEARCH RESULTS (${(articles || []).length} links):` : `OSINT RESULTS (${(articles || []).length} items):`)
      : `PRESS ARTICLES (${(articles || []).length} sources):`;

    const userContent = `${label}\n\n${articlesText}\n\nQUERY: ${query}\n\nProvide a comprehensive analysis addressing this query.`;

    // Define tool for structured output
    const analysisTool = {
      type: "function",
      function: {
        name: "provide_analysis",
        description: "Provide structured analysis of the articles",
        parameters: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["person", "organization", "location", "topic", "event", "website"] },
                  role: { type: "string" },
                  mentions: { type: "number" }
                },
                required: ["name", "type", "role", "mentions"],
                additionalProperties: false
              }
            },
            summary: { 
              type: "string",
              description: "Comprehensive analysis addressing the query with key facts, developments, actors, and context"
            },
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scenario: { type: "string" },
                  probability: { type: "string", enum: ["low", "medium", "high"] },
                  confidenceFactor: { type: "string" },
                  riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  timeframe: { type: "string" }
                },
                required: ["scenario", "probability", "timeframe"],
                additionalProperties: false
              }
            },
            sentiment: {
              type: "object",
              properties: {
                overall: { type: "string" },
                positive: { type: "number" },
                neutral: { type: "number" },
                negative: { type: "number" },
                themes: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              additionalProperties: true
            }
          },
          required: ["entities", "summary", "predictions"],
          additionalProperties: false
        }
      }
    };

    console.log('Calling AI with tool calling for structured output...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        tools: [analysisTool],
        tool_choice: { type: "function", function: { name: "provide_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Groq rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI Response received');

    // Extract analysis from tool call
    let analysis;
    try {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'provide_analysis') {
        console.error('No valid tool call in response:', JSON.stringify(data, null, 2));
        throw new Error('AI did not use the expected tool');
      }

      analysis = JSON.parse(toolCall.function.arguments);
      console.log('Analysis parsed successfully from tool call');
    } catch (parseError) {
      console.error('Failed to parse tool call response:', parseError);
      console.error('Response data:', JSON.stringify(data, null, 2));
      throw new Error('Failed to parse AI analysis from tool call');
    }
    
    console.log('Analysis completed successfully');

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

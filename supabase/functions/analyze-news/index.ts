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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    // Prompts
    const osintSocialSystem = {
      en: `You are an OSINT analyst specializing in social media intelligence and community sentiment analysis.

CRITICAL: These are SOCIAL MEDIA posts (BlueSky, Mastodon, X/Twitter, Reddit) — NOT verified news sources.
Focus on: community pulse, emerging narratives, divergences/convergences, weak signals, credibility and volatility. Answer in English. Return valid JSON only.`,
      fr: `Vous êtes un analyste OSINT spécialisé réseaux sociaux et analyse de sentiments communautaires.
CRITIQUE: Ce sont des posts de RÉSEAUX SOCIAUX (BlueSky, Mastodon, X/Twitter, Reddit) — PAS des sources journalistiques vérifiées.
Concentrez-vous sur: pouls communautaire, récits émergents, divergences/convergences, signaux faibles, crédibilité et volatilité. Répondez en français. JSON valide uniquement.`,
      it: `Sei un analista OSINT dei social media e del sentiment.
CRITICO: Post dei SOCIAL (BlueSky, Mastodon, X/Twitter, Reddit) — NON fonti giornalistiche verificate.
Focus: polso comunità, narrazioni emergenti, divergenze/convergenze, segnali deboli, credibilità e volatilità. Rispondi in italiano. Solo JSON valido.`
    };
    const pressSystem = {
      en: 'You are an intelligence analyst for verified press/media articles. Be concise but comprehensive. Answer in English. Return valid JSON only.',
      fr: "Vous êtes analyste pour des articles de presse vérifiés. Soyez concis mais complet. Répondez en français. JSON valide uniquement.",
      it: "Sei un analista per articoli di stampa verificati. Sii conciso ma completo. Rispondi in italiano. Solo JSON valido."
    };
    const webSerpSystem = {
      en: 'You analyze WEB SEARCH RESULTS (Google SERP). Do NOT infer human/community sentiment. Provide objective synthesis of topics, entities, and sources. Answer in English. Return valid JSON only.',
      fr: "Vous analysez des RÉSULTATS DE RECHERCHE WEB (Google). N’inférez PAS de sentiment humain/communautaire. Fournissez une synthèse objective des thèmes, entités et sources. Répondez en français. JSON valide uniquement.",
      it: "Analizzi RISULTATI DI RICERCA WEB (Google). NON dedurre sentiment umano/comunitario. Sintesi oggettiva di temi, entità e fonti. Rispondi in italiano. Solo JSON valido."
    };

    let systemPrompts = pressSystem;
    if (sourceType === 'osint') {
      if (hasOnlyWeb) {
        systemPrompts = webSerpSystem;
      } else if (hasMixedSources) {
        // Mixed sources: use social system but with note about web sources
        systemPrompts = osintSocialSystem;
      } else if (hasSocial) {
        systemPrompts = osintSocialSystem;
      } else {
        systemPrompts = pressSystem;
      }
    }
    
    const osintSocialUser = {
      en: `Provide OSINT COMMUNITY ANALYSIS in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Capture the community pulse, emerging narratives, divergences/convergences, credibility, volatility. Be direct.",
  "predictions": [{"scenario":"Based on discourse patterns","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"string","divergences":"string","convergences":"string","weak_signals":"string"}
}`,
      fr: `Fournir une ANALYSE COMMUNAUTAIRE OSINT en JSON:
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Capturez le pouls, récits émergents, divergences/convergences, crédibilité, volatilité. Soyez direct.",
  "predictions": [{"scenario":"Basé sur les schémas de discours","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"string","divergences":"string","convergences":"string","weak_signals":"string"}
}`,
      it: `Fornire ANALISI OSINT COMUNITÀ in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Polso della comunità, narrazioni emergenti, divergenze/convergenze, credibilità, volatilità.",
  "predictions": [{"scenario":"Basato sui pattern del discorso","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"string","divergences":"string","convergenze":"string","weak_signals":"string"}
}`
    };
    const pressUser = {
      en: `Provide PRESS ANALYSIS in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Concise, complete. Key facts, developments, actors, context.",
  "predictions": [{"scenario":"string","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"as reported in press","experts":"expert analysis from press"}
}`,
      fr: `Fournir une ANALYSE PRESSE en JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Concis, complet. Faits clés, développements, acteurs, contexte.",
  "predictions": [{"scenario":"string","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"tel que rapporté par la presse","experts":"analyses d'experts de la presse"}
}`,
      it: `Fornire ANALISI STAMPA in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Conciso, completo. Fatti chiave, sviluppi, attori, contesto.",
  "predictions": [{"scenario":"string","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"come riportato dalla stampa","experts":"analisi degli esperti dalla stampa"}
}`
    };
    const webSerpUser = {
      en: `Provide WEB SERP SYNTHESIS in JSON (DO NOT infer human/community sentiment):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Objective overview of themes, entities, notable sources/domains. No sentiment inference.",
  "predictions": [{"scenario":"Potential next developments inferred from sources (optional)","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"not_applicable_for_serp"}
}`,
      fr: `Fournir une SYNTHÈSE SERP WEB en JSON (NE PAS inférer de sentiment humain/communautaire):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Aperçu objectif des thèmes, entités, sources/domaines notables. Pas d'inférence de sentiment.",
  "predictions": [{"scenario":"Développements potentiels (optionnel)","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"non_applicable_pour_serp"}
}`,
      it: `Fornire SINTESI SERP WEB in JSON (NON dedurre sentimento):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Panoramica oggettiva di temi, entità, fonti/domìni notevoli. Nessuna inferenza di sentiment.",
  "predictions": [{"scenario":"Sviluppi potenziali (opzionale)","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"non_applicabile_per_serp"}
}`
    };

    let userPromptInstructions = pressUser;
    if (sourceType === 'osint') {
      if (hasOnlyWeb) {
        userPromptInstructions = webSerpUser;
      } else if (hasMixedSources) {
        // Mixed sources: use social user prompt with special instruction
        userPromptInstructions = osintSocialUser;
      } else if (hasSocial) {
        userPromptInstructions = osintSocialUser;
      } else {
        userPromptInstructions = pressUser;
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompts[language as keyof typeof systemPrompts] || systemPrompts.en },
          { 
            role: 'user', 
            content: (() => {
              const label =
                sourceType === 'osint'
                  ? (hasOnlyWeb ? `WEB SEARCH RESULTS (${(articles || []).length} links):` : `OSINT RESULTS (${(articles || []).length} items):`)
                  : `PRESS ARTICLES (${(articles || []).length} sources):`;
              
              let note = '';
              if (sourceType === 'osint' && hasMixedSources) {
                note = '\n\nIMPORTANT MIXED SOURCES INSTRUCTIONS:\n- For items where Platform is google/web/serp: these are WEB SEARCH RESULTS, NOT human opinions. Use them ONLY as factual context and to enrich your understanding of topics/entities.\n- For items from social platforms (BlueSky, Mastodon, X/Twitter, Reddit): analyze community sentiment, discourse patterns, emerging narratives.\n- DO NOT attribute sentiment to web search results. They supplement your analysis but should not be treated as community voices.';
              }
              
              const up = userPromptInstructions[language as keyof typeof userPromptInstructions] || userPromptInstructions.en;
              return `Query: "${query}"\n\n${label}\n${articlesText}${note}\n\n${up}`;
            })()
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add funds to your Lovable AI workspace.');
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let analysis;
    try {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', data.choices[0].message.content);
      throw new Error('Failed to parse AI analysis');
    }
    
    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    // --- PROMPTS SYSTÈME MIS À JOUR ---
    const osintSocialSystem = {
      en: `You are an OSINT analyst specializing in social media intelligence and **weak signal detection**. CRITICAL: These are SOCIAL MEDIA posts (BlueSky, Mastodon, X/Twitter, Reddit) — NOT verified news sources. Focus on: **community pulse (mood)**, **emerging/dissonant narratives**, **significant divergences/convergences**, **weak signals**, credibility and volatility. Answer in English. Return valid JSON only.`,
      fr: `Vous êtes un analyste du renseignement en sources ouvertes (OSINT) spécialisé dans la veille sur les réseaux sociaux pour identifier des **signaux faibles** et des **tendances sensibles**. CRITIQUE : Ce sont des posts de RÉSEAUX SOCIAUX (BlueSky, Mastodon, X/Twitter, Reddit) — **NON** des sources journalistiques vérifiées. Concentrez-vous sur : le **pouls communautaire (mood)**, les **récits et thèmes émergents/dissonants**, les **divergences/convergences significatives**, les **signaux faibles** (information peu discutée mais potentiellement cruciale), la **crédibilité perçue** et la **volatilité du discours**. Répondez en français. JSON valide uniquement.`,
      it: `Sei un analista OSINT specializzato in social media e **individuazione di segnali deboli**. CRITICO: Post dei SOCIAL (BlueSky, Mastodon, X/Twitter, Reddit) — NON fonti giornalistiche verificate. Focus: **polso comunità**, **narrazioni emergenti/dissonanti**, **divergenze/convergenze significative**, **segnali deboli**, credibilità e volatilità. Rispondi in italiano. Solo JSON valido.`
    };
    const pressSystem = {
      en: 'You are an intelligence analyst for verified press/media articles. Your task is to provide a factual, concise, but comprehensive synthesis, aggregating key information. Focus on identifying key facts, recent developments, main actors, and the overall context of the query. Do not make any inferences not justified by the sources. Answer in English. Return valid JSON only.',
      fr: "Vous êtes un analyste du renseignement pour des articles de presse et des médias vérifiés. Votre tâche est de fournir une synthèse factuelle, concise, mais complète, en agrégeant les informations clés. Concentrez-vous sur l'identification des faits saillants, des développements récents, des acteurs principaux et du contexte global de la requête. Ne faites aucune inférence non justifiée par les sources. Répondez en français. JSON valide uniquement.",
      it: "Sei un analista per articoli di stampa verificati. Il tuo compito è fornire una sintesi fattuale, concisa ma completa, aggregando le informazioni chiave. Concentrati sull'identificazione di fatti salienti, sviluppi, attori e contesto. Non fare inferenze non giustificate dalle fonti. Rispondi in italiano. Solo JSON valido."
    };
    const webSerpSystem = {
      en: 'You are an expert in web search analysis (Google SERP). Your mission is to transform raw search results into a **structured, answer-oriented analysis** that directly addresses the complexity of the query. Provide an objective synthesis of themes, entities, structures, and milestones (past/future) discovered. DO NOT infer human/community sentiment. Your analysis must answer to "what, how, around what, via what milestones". Answer in English. Return valid JSON only.',
      fr: "Vous êtes un expert en analyse de recherche web (Google SERP). Votre mission est de transformer les résultats de recherche bruts en une **analyse structurée et orientée réponse** qui adresse directement la complexité de la requête. Fournissez une synthèse objective des thèmes, entités, structures et jalons (passés/futurs) découverts. N’inférez **JAMAIS** de sentiment humain/communautaire. Votre analyse doit répondre à 'quoi, comment, autour de quoi, via quels jalons'. Répondez en français. JSON valide uniquement.",
      it: "Sei un esperto di analisi di ricerca web (Google SERP). La tua missione è trasformare i risultati di ricerca in una **analisi strutturata e orientata alla risposta** che affronti direttamente la complessità della query. Fornisci una sintesi obiettiva di temi, entità, strutture e pietre miliari (passate/future). NON dedurre sentiment umano/comunitario. La tua analisi deve rispondere a 'cosa, come, attorno a cosa, tramite quali pietre miliari'. Rispondi in italiano. Solo JSON valido."
    };

    let systemPrompts = pressSystem;
    if (sourceType === 'osint') {
      if (hasOnlyWeb) {
        systemPrompts = webSerpSystem;
      } else if (hasMixedSources) {
        systemPrompts = osintSocialSystem;
      } else if (hasSocial) {
        systemPrompts = osintSocialSystem;
      } else {
        systemPrompts = pressSystem;
      }
    }
    
    // --- PROMPTS UTILISATEUR MIS À JOUR ---
    const osintSocialUser = {
      en: `Provide OSINT COMMUNITY ANALYSIS in JSON (emphasize weak signals and emerging narratives):
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Capture the community pulse, dominant narratives, significant divergences/convergences, perceived credibility, and volatility of the discourse. Be direct and factual about the state of the online discourse.",
  "predictions": [{"scenario":"Based on the evolution of online discourse patterns.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"Dominant trend of the community mood (e.g., 'Concern', 'Skepticism').","divergences":"Major viewpoints that conflict or create controversies.","convergences":"Themes and opinions on which the community largely agrees.","weak_signals":"**Weak Signals**: Information, themes, or actors scarcely mentioned, but potentially critical or signaling a change in trend. Be specific."}
}`,
      fr: `Fournir une ANALYSE COMMUNAUTAIRE OSINT en JSON (mettez l'accent sur les signaux faibles et les narratives émergentes):
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Capturez le pouls communautaire, les récits dominants, les divergences/convergences, la crédibilité perçue et la volatilité du discours. Soyez direct et factuel sur l'état du discours en ligne.",
  "predictions": [{"scenario":"Basé sur l'évolution des schémas de discours en ligne.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"Tendance dominante de l'humeur communautaire (e.g. 'Inquiétude', 'Scepticisme').","divergences":"Points de vue majeurs qui s'opposent ou créent des controverses.","convergences":"Thèmes et opinions sur lesquels la communauté s'accorde largement.","weak_signals":"**Signaux faibles** : Informations, thèmes ou acteurs peu mentionnés, mais qui pourraient être d'une importance critique ou marquer un changement de tendance. Soyez précis."}
}`,
      it: `Fornire ANALISI OSINT COMUNITÀ in JSON (enfatizzare segnali deboli e narrazioni emergenti):
{
  "entities": [{"name":"string","type":"person|organization|location|hashtag","role":"string","mentions":number}],
  "summary": "Polso della comunità, narrazioni dominanti, divergenze/convergenze significative, credibilità percepita e volatilità del discorso. Sii diretto e fattuale sullo stato del discorso online.",
  "predictions": [{"scenario":"Basato sull'evoluzione dei modelli di discorso online.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"community_mood":"Tendenza dominante dell'umore comunitario (es. 'Preoccupazione', 'Scetticismo').","divergences":"Punti di vista maggiori in conflitto o che creano controversie.","convergenze":"Temi e opinioni su cui la comunità concorda ampiamente.","weak_signals":"**Segnali Deboli**: Informazioni, temi o attori poco menzionati, ma potenzialmente critici o che segnalano un cambio di tendenza. Sii specifico."}
}`
    };
    const pressUser = {
      en: `Provide PRESS ANALYSIS in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Concise, complete synthesis of key facts, developments, actors, and context reported by the press.",
  "predictions": [{"scenario":"Potential developments based on media analyses and trends.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"Overall sentiment as reflected by media sources (e.g. 'Cautious', 'Optimistic').","experts":"Trend of analysis and opinions of experts cited in the press."}
}`,
      fr: `Fournir une ANALYSE PRESSE en JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Synthèse concise et complète des faits clés, des développements, des acteurs et du contexte rapportés par la presse.",
  "predictions": [{"scenario":"Développements potentiels basés sur les analyses et tendances médiatiques.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"Sentiment global tel que reflété par les sources médiatiques. (e.g. 'Cauteloso', 'Optimiste')","experts":"Tendance de l'analyse et des opinions des experts cités dans la presse."}
}`,
      it: `Fornire ANALISI STAMPA in JSON:
{
  "entities": [{"name":"string","type":"person|organization|location","role":"string","mentions":number}],
  "summary": "Sintesi concisa e completa di fatti chiave, sviluppi, attori e contesto riportati dalla stampa.",
  "predictions": [{"scenario":"Sviluppi potenziali basati su analisi e tendenze mediatiche.","probability":"high|medium|low","timeframe":"string"}],
  "sentiment": {"public":"Sentimento generale come riportato dalle fonti mediatiche.","experts":"Tendenza di analisi e opinioni degli esperti citati dalla stampa."}
}`
    };
    const webSerpUser = {
      en: `Provide WEB SERP SYNTHESIS and ANALYSIS in JSON (MUST address the query in a structured manner; DO NOT infer human/community sentiment):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Objective and structured analysis answering the query. Cover key aspects, mechanisms, milestones (past and future), and central themes. Base your findings only on the content of the provided sources.",
  "predictions": [{"scenario":"Potential future developments inferred from sources (non-sentiment).","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"not_applicable_for_serp: No inference of human/community sentiment is allowed for web search results."}
}`,
      fr: `Fournir une SYNTHÈSE et ANALYSE SERP WEB en JSON (DOIT répondre à la requête de manière structurée; NE PAS inférer de sentiment humain/communautaire):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Analyse objective et structurée répondant à la requête. Couvrez les aspects clés, les mécanismes, les jalons (passés et futurs), et les thèmes centraux. Basez-vous uniquement sur le contenu des sources fournies.",
  "predictions": [{"scenario":"Développements potentiels futurs inférés des informations de sources (non-sentiment).","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"non_applicable_pour_serp: Aucune inférence de sentiment humain/communautaire n'est permise pour les résultats de recherche web."}
}`,
      it: `Fornire SINTESI e ANALISI SERP WEB in JSON (DEVE rispondere alla query in modo strutturato; NON dedurre sentimento):
{
  "entities": [{"name":"string","type":"person|organization|location|topic|website","role":"string","mentions":number}],
  "summary": "Analisi obiettiva e strutturata che risponde alla query. Copri aspetti chiave, meccanismi, pietre miliari (passate e future) e temi centrali. Basati solo sul contenuto delle fonti fornite.",
  "predictions": [{"scenario":"Sviluppi potenziali futuri dedotti dalle informazioni delle fonti (non-sentiment).","probability":"low|medium|high","timeframe":"string"}],
  "sentiment": {"note":"non_applicabile_per_serp: Nessuna inferenza di sentimento umano/comunitario è permessa per i risultati di ricerca web."}
}`
    };

    let userPromptInstructions = pressUser;
    if (sourceType === 'osint') {
      if (hasOnlyWeb) {
        userPromptInstructions = webSerpUser;
      } else if (hasMixedSources) {
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
                note = '\n\nIMPORTANT INSTRUCTIONS SOURCES MIXTES:\n- Pour les éléments où la Plateforme est google/web/serp: ce sont des RÉSULTATS DE RECHERCHE WEB, PAS des opinions humaines. Utilisez-les UNIQUEMENT comme contexte factuel et pour enrichir votre compréhension des sujets/entités.\n- Pour les éléments provenant des plateformes sociales (BlueSky, Mastodon, X/Twitter, Reddit): analysez le sentiment communautaire, les schémas de discours et les récits émergents, en privilégiant la détection de signaux faibles.\n- N’attribuez PAS de sentiment aux résultats de recherche web. Ils complètent votre analyse mais ne doivent pas être traités comme des voix communautaires.';
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

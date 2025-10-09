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

    // Different analysis approach for Press vs OSINT
    const systemPrompts = sourceType === 'osint' ? {
      en: `You are an OSINT analyst specializing in social media intelligence and community sentiment analysis. 

CRITICAL: These are SOCIAL MEDIA posts from platforms like Mastodon and BlueSky - NOT verified news sources.

Your analysis must focus on:
1) COMMUNITY PULSE & SENTIMENT: What are online communities saying? What emotions, concerns, hopes are expressed?
2) EMERGING NARRATIVES: What stories, theories, or interpretations are forming in social networks?
3) DIVERGENCE & CONVERGENCE: Where do opinions split? Where do they align? Identify camps, factions, consensus.
4) SIGNAL DETECTION: Spot early warnings, weak signals, grassroots movements before they hit mainstream media
5) CREDIBILITY ASSESSMENT: Which voices have high engagement? Which accounts seem influential vs fringe?
6) VOLATILITY INDICATORS: What topics are heating up? What sudden shifts in discourse?

Remember: This is the PULSE of online communities - more reactive, emotional, and volatile than press. Capture the MOOD, the DISCOURSE, the DYNAMICS.

IMPORTANT: Respond ONLY in English. Return valid JSON only.`,
      fr: `Vous êtes un analyste OSINT spécialisé dans l'intelligence des réseaux sociaux et l'analyse des sentiments communautaires.

CRITIQUE: Ce sont des posts de RÉSEAUX SOCIAUX (Mastodon, BlueSky) - PAS des sources d'information vérifiées.

Votre analyse doit se concentrer sur:
1) POULS & SENTIMENT COMMUNAUTAIRE: Que disent les communautés en ligne? Quelles émotions, préoccupations, espoirs s'expriment?
2) RÉCITS ÉMERGENTS: Quelles histoires, théories ou interprétations se forment dans les réseaux sociaux?
3) DIVERGENCES & CONVERGENCES: Où les opinions divergent? Où s'alignent-elles? Identifiez les camps, factions, consensus.
4) DÉTECTION DE SIGNAUX: Repérez les signaux faibles, mouvements de terrain avant qu'ils atteignent les médias mainstream
5) ÉVALUATION CRÉDIBILITÉ: Quelles voix ont un fort engagement? Quels comptes semblent influents vs marginaux?
6) INDICATEURS DE VOLATILITÉ: Quels sujets s'échauffent? Quels changements soudains dans le discours?

Rappel: C'est le POULS des communautés en ligne - plus réactif, émotionnel et volatile que la presse. Capturez l'AMBIANCE, le DISCOURS, les DYNAMIQUES.

IMPORTANT: Répondez UNIQUEMENT en français. Retournez uniquement du JSON valide.`,
      it: `Sei un analista OSINT specializzato nell'intelligence dei social media e nell'analisi del sentiment delle comunità.

CRITICO: Questi sono post dai SOCIAL MEDIA (Mastodon, BlueSky) - NON fonti giornalistiche verificate.

La tua analisi deve concentrarsi su:
1) POLSO & SENTIMENT COMUNITARIO: Cosa dicono le comunità online? Quali emozioni, preoccupazioni, speranze vengono espresse?
2) NARRAZIONI EMERGENTI: Quali storie, teorie o interpretazioni si stanno formando nei social network?
3) DIVERGENZE & CONVERGENZE: Dove le opinioni divergono? Dove si allineano? Identifica campi, fazioni, consenso.
4) RILEVAMENTO SEGNALI: Individua segnali deboli, movimenti dal basso prima che raggiungano i media mainstream
5) VALUTAZIONE CREDIBILITÀ: Quali voci hanno alto engagement? Quali account sembrano influenti vs marginali?
6) INDICATORI VOLATILITÀ: Quali argomenti si stanno scaldando? Quali cambiamenti improvvisi nel discorso?

Ricorda: Questo è il POLSO delle comunità online - più reattivo, emotivo e volatile della stampa. Cattura l'ATMOSFERA, il DISCORSO, le DINAMICHE.

IMPORTANTE: Rispondi SOLO in italiano. Restituisci solo JSON valido.`
    } : {
      en: 'You are an intelligence analyst specializing in press and media analysis. Analyze the provided news articles from verified journalistic sources and extract: 1) Key entities (people, organizations, locations) with their roles in the context. 2) A CONCISE yet COMPREHENSIVE summary - be straight to the point while capturing ALL critical information, key facts, and important developments from verified press sources. 3) Predictive analysis of what may happen next with probabilities. 4) Public sentiment and expert opinions as reported in the press. IMPORTANT: Respond ONLY in English. Return valid JSON only.',
      fr: "Vous êtes un analyste du renseignement spécialisé dans l'analyse de la presse et des médias. Analysez les articles de presse issus de sources journalistiques vérifiées et extrayez : 1) Entités clés (personnes, organisations, lieux) avec leurs rôles dans le contexte. 2) Un résumé CONCIS mais COMPLET - allez droit au but tout en capturant TOUTES les informations critiques, faits clés et développements importants issus de sources de presse vérifiées. 3) Une analyse prédictive de ce qui pourrait se passer ensuite avec des probabilités. 4) Le sentiment public et les opinions d'experts tels que rapportés dans la presse. IMPORTANT: Répondez UNIQUEMENT en français. Retournez uniquement du JSON valide.",
      it: "Sei un analista dell'intelligence specializzato nell'analisi della stampa e dei media. Analizza gli articoli di stampa da fonti giornalistiche verificate ed estrai: 1) Entità chiave (persone, organizzazioni, luoghi) con i loro ruoli nel contesto. 2) Un riepilogo CONCISO ma COMPLETO - vai dritto al punto catturando TUTTE le informazioni critiche, fatti chiave e sviluppi importanti da fonti stampa verificate. 3) Analisi predittiva di cosa potrebbe accadere dopo con probabilità. 4) Sentiment pubblico e opinioni di esperti come riportati nella stampa. IMPORTANTE: Rispondi SOLO in italiano. Restituisci solo JSON valido."
    };
    
    const userPromptInstructions = sourceType === 'osint' ? {
      en: `Provide OSINT COMMUNITY ANALYSIS in JSON format with this structure:
{
  "entities": [{"name": "string", "type": "person|organization|location|hashtag", "role": "string", "mentions": number}],
  "summary": "FOCUS: Capture the PULSE of online communities - What are people FEELING and SAYING? What narratives are EMERGING? What's TRENDING? Be DIRECT and INSIGHTFUL about the community dynamics and discourse patterns.",
  "predictions": [{"scenario": "Based on community discourse patterns and emerging narratives", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"community_mood": "Overall emotional tone and intensity in communities", "divergences": "Main points of disagreement or different camps", "convergences": "Areas of consensus or shared concern", "weak_signals": "Early indicators or grassroots movements"}
}`,
      fr: `Fournissez une ANALYSE OSINT COMMUNAUTAIRE au format JSON avec cette structure:
{
  "entities": [{"name": "string", "type": "person|organization|location|hashtag", "role": "string", "mentions": number}],
  "summary": "FOCUS: Capturez le POULS des communautés en ligne - Que ressentent et disent les gens? Quels récits ÉMERGENT? Qu'est-ce qui est TENDANCE? Soyez DIRECT et PERSPICACE sur les dynamiques communautaires et les schémas de discours.",
  "predictions": [{"scenario": "Basé sur les schémas de discours communautaire et les récits émergents", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"community_mood": "Ton émotionnel global et intensité dans les communautés", "divergences": "Principaux points de désaccord ou différents camps", "convergences": "Zones de consensus ou préoccupation partagée", "weak_signals": "Indicateurs précoces ou mouvements de terrain"}
}`,
      it: `Fornisci un'ANALISI OSINT DELLA COMUNITÀ in formato JSON con questa struttura:
{
  "entities": [{"name": "string", "type": "person|organization|location|hashtag", "role": "string", "mentions": number}],
  "summary": "FOCUS: Cattura il POLSO delle comunità online - Cosa stanno SENTENDO e DICENDO le persone? Quali narrazioni stanno EMERGENDO? Cosa è di TENDENZA? Sii DIRETTO e PERSPICACE sulle dinamiche comunitarie e sui pattern del discorso.",
  "predictions": [{"scenario": "Basato sui pattern di discorso comunitario e narrazioni emergenti", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"community_mood": "Tono emotivo complessivo e intensità nelle comunità", "divergences": "Principali punti di disaccordo o campi diversi", "convergences": "Aree di consenso o preoccupazione condivisa", "weak_signals": "Indicatori precoci o movimenti dal basso"}
}`
    } : {
      en: `Provide PRESS ANALYSIS in JSON format with this structure:
{
  "entities": [{"name": "string", "type": "person|organization|location", "role": "string", "mentions": number}],
  "summary": "CONCISE and STRAIGHT TO THE POINT while capturing ALL essential information from verified press sources. Include: key facts, critical developments, main actors, important context.",
  "predictions": [{"scenario": "string", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"public": "Public opinion as reported in press", "experts": "Expert opinions and analysis from press sources"}
}`,
      fr: `Fournissez une ANALYSE DE PRESSE au format JSON avec cette structure:
{
  "entities": [{"name": "string", "type": "person|organization|location", "role": "string", "mentions": number}],
  "summary": "CONCIS et DIRECT tout en capturant TOUTES les informations essentielles des sources de presse vérifiées. Incluez: faits clés, développements critiques, acteurs principaux, contexte important.",
  "predictions": [{"scenario": "string", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"public": "Opinion publique telle que rapportée dans la presse", "experts": "Opinions et analyses d'experts des sources de presse"}
}`,
      it: `Fornisci un'ANALISI STAMPA in formato JSON con questa struttura:
{
  "entities": [{"name": "string", "type": "person|organization|location", "role": "string", "mentions": number}],
  "summary": "CONCISO e DIRETTO AL PUNTO catturando TUTTE le informazioni essenziali da fonti stampa verificate. Includi: fatti chiave, sviluppi critici, attori principali, contesto importante.",
  "predictions": [{"scenario": "string", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"public": "Opinione pubblica come riportata nella stampa", "experts": "Opinioni ed analisi di esperti da fonti stampa"}
}`
    };

    const articlesText = articles.map((a: any, i: number) => {
      const baseInfo = `[${i+1}] ${a.title}\n${a.description}\nSource: ${a.source?.name || 'Unknown'}\nPublished: ${a.publishedAt}\nURL: ${a.url}`;
      
      // Add OSINT-specific metadata if available
      if (a.osint) {
        const osintInfo = `\nPlatform: ${a.osint.platform}\nCredibility Score: ${a.osint.credibilityScore}/100\nEngagement: ${a.osint.engagement?.likes || 0} likes, ${a.osint.engagement?.reposts || 0} reposts, ${a.osint.engagement?.replies || 0} replies`;
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
            content: sourceType === 'osint' 
              ? `Query: "${query}"\n\nSOCIAL MEDIA POSTS (${articles.length} posts from Mastodon/BlueSky):\n${articlesText}\n\n${userPromptInstructions[language as keyof typeof userPromptInstructions] || userPromptInstructions.en}`
              : `Query: "${query}"\n\nPRESS ARTICLES (${articles.length} verified news sources):\n${articlesText}\n\n${userPromptInstructions[language as keyof typeof userPromptInstructions] || userPromptInstructions.en}`
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

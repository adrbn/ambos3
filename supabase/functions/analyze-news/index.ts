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
    const { articles, query, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing articles for query:', query);

    const systemPrompts = {
      en: 'You are an intelligence analyst specializing in OSINT. Analyze the provided news articles and extract: 1) Key entities (people, organizations, locations) with their roles in the context. 2) A CONCISE yet COMPREHENSIVE summary - be straight to the point while capturing ALL critical information, key facts, and important developments. Avoid redundancy but miss nothing essential. 3) Predictive analysis of what may happen next with probabilities. 4) Public sentiment and expert opinions. Return valid JSON only.',
      fr: "Vous êtes un analyste du renseignement spécialisé en OSINT. Analysez les articles fournis et extrayez : 1) Entités clés (personnes, organisations, lieux) avec leurs rôles dans le contexte. 2) Un résumé CONCIS mais COMPLET - allez droit au but tout en capturant TOUTES les informations critiques, faits clés et développements importants. Évitez la redondance mais n'omettez rien d'essentiel. 3) Une analyse prédictive de ce qui pourrait se passer ensuite avec des probabilités. 4) Le sentiment public et les opinions d'experts. Retournez uniquement du JSON valide.",
      it: "Sei un analista dell'intelligence specializzato in OSINT. Analizza gli articoli forniti ed estrai: 1) Entità chiave (persone, organizzazioni, luoghi) con i loro ruoli nel contesto. 2) Un riepilogo CONCISO ma COMPLETO - vai dritto al punto catturando TUTTE le informazioni critiche, fatti chiave e sviluppi importanti. Evita ridondanze ma non tralasciare nulla di essenziale. 3) Analisi predittiva di cosa potrebbe accadere dopo con probabilità. 4) Sentiment pubblico e opinioni di esperti. Restituisci solo JSON valido."
    };

    const articlesText = articles.map((a: any, i: number) => 
      `[${i+1}] ${a.title}\n${a.description}\nSource: ${a.source?.name || 'Unknown'}\nPublished: ${a.publishedAt}\nURL: ${a.url}`
    ).join('\n\n');

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
            content: `Query: "${query}"\n\nArticles:\n${articlesText}\n\nProvide analysis in JSON format with this structure:
{
  "entities": [{"name": "string", "type": "person|organization|location", "role": "string", "mentions": number}],
  "summary": "CRITICAL: Make this summary CONCISE and STRAIGHT TO THE POINT while capturing ALL essential information. Include: key facts, critical developments, main actors, important context. Be synthetic but comprehensive - every sentence must add value, no fluff or repetition.",
  "predictions": [{"scenario": "string", "probability": "high|medium|low", "timeframe": "string"}],
  "sentiment": {"public": "string", "experts": "string"}
}`
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

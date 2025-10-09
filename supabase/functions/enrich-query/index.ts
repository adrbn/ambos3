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
    const { query, language } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`Enriching query: "${query}" (language: ${language})`);

    const systemPrompt = `Tu es un expert en requêtes de recherche booléennes pour les API de news. 
Ta tâche est de transformer une requête simple en une requête complexe optimisée avec des opérateurs booléens (AND, OR, NOT).

Règles:
- Utilise des parenthèses pour grouper les termes
- Inclus des synonymes et variations avec OR
- Utilise AND pour combiner les concepts
- Utilise NOT pour exclure les termes non pertinents
- Ajoute des termes en anglais ET dans la langue demandée si pertinent
- Garde la requête concise mais complète

Exemples:
"conférence cyber italie" → "(cybersécurité OR cybersecurity OR tech) AND (conférence OR sommet OR événement OR colloque OR workshop OR event OR show) AND Italie"
"elections usa" → "(élection OR election OR présidentielle OR presidential) AND (États-Unis OR USA OR United States OR America)"
"climat france" → "(climat OR climate OR réchauffement OR warming OR environnement OR environment) AND France"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Transforme cette requête simple en requête booléenne complexe (langue: ${language}):\n\n"${query}"\n\nRéponds UNIQUEMENT avec la requête enrichie, sans explications.`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enrichedQuery = data.choices[0].message.content.trim();
    
    // Remove any potential quotes around the response
    const cleanedQuery = enrichedQuery.replace(/^["']|["']$/g, '');

    console.log(`Enriched query: "${cleanedQuery}"`);

    return new Response(
      JSON.stringify({ 
        originalQuery: query,
        enrichedQuery: cleanedQuery 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in enrich-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

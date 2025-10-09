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
    const { query, language, sourceType = 'news', osintPlatforms = [] } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Enriching query: "${query}" (language: ${language}, sourceType: ${sourceType}, platforms: ${osintPlatforms.join(', ')})`);

    // BlueSky uses simple text search, not hashtags
    const isBlueskyOnly = sourceType === 'osint' && osintPlatforms.length === 1 && osintPlatforms[0] === 'bluesky';
    const isMastodonOnly = sourceType === 'osint' && osintPlatforms.length === 1 && osintPlatforms[0] === 'mastodon';
    
    let systemPrompt: string;
    let userPrompt: string;
    
    if (isBlueskyOnly) {
      // BlueSky: simple text with keywords, no hashtags
      systemPrompt = `Tu es un expert en recherche sur BlueSky.
Ta tâche est de transformer une requête simple en mots-clés pertinents pour la recherche BlueSky.

Règles CRITIQUES:
- Retourne UNIQUEMENT des mots-clés séparés par des espaces
- PAS de hashtags (pas de #)
- Maximum 5-7 mots-clés les plus pertinents
- Inclus des variantes en anglais ET dans la langue demandée
- Pas de parenthèses, pas d'opérateurs booléens
- Mots simples et composés pertinents

Exemples:
"Macron" → "Macron France president politique french politics"
"elections usa" → "elections USA vote presidential Biden Trump"
"climat france" → "climat climate France environnement réchauffement climatique"`;
      
      userPrompt = `Transforme cette requête en mots-clés pour BlueSky (langue: ${language}):\n\n"${query}"\n\nRéponds UNIQUEMENT avec les mots-clés séparés par des espaces, sans hashtags, sans explications.`;
    } else if (isMastodonOnly) {
      // Mastodon: hashtags only
      systemPrompt = `Tu es un expert en recherche sur Mastodon.
Ta tâche est de transformer une requête simple en une liste de hashtags pertinents pour Mastodon.

Règles CRITIQUES:
- Retourne UNIQUEMENT des hashtags séparés par des espaces
- Chaque hashtag commence par #
- Maximum 3-5 hashtags les plus pertinents
- Inclus des variantes en anglais ET dans la langue demandée
- Pas de parenthèses, pas d'opérateurs booléens
- Hashtags simples sans espaces (utilise CamelCase si nécessaire)

Exemples:
"Macron" → "#Macron #France #Politique #Élysée #FrenchPolitics"
"elections usa" → "#election #USA #politics #vote #democracy"
"climat france" → "#climate #france #environment #climatechange #écologie"`;
      
      userPrompt = `Transforme cette requête en hashtags pour Mastodon (langue: ${language}):\n\n"${query}"\n\nRéponds UNIQUEMENT avec les hashtags séparés par des espaces, sans explications.`;
    } else if (sourceType === 'osint') {
      // Both platforms: mix of hashtags for Mastodon + keywords for BlueSky
      systemPrompt = `Tu es un expert en recherche sur les réseaux sociaux (Mastodon et BlueSky).
Ta tâche est de créer une requête mixte avec des hashtags (pour Mastodon) ET des mots-clés simples (pour BlueSky).

Règles CRITIQUES:
- Commence par 3-4 hashtags pour Mastodon (avec #)
- Ajoute ensuite 3-4 mots-clés simples pour BlueSky (sans #)
- Sépare tout par des espaces
- Inclus des variantes en anglais ET dans la langue demandée

Exemple:
"Macron" → "#Macron #France #Politique president french politics"`;
      
      userPrompt = `Transforme cette requête pour Mastodon ET BlueSky (langue: ${language}):\n\n"${query}"\n\nRéponds UNIQUEMENT avec les hashtags puis les mots-clés, sans explications.`;
    } else {
      // News APIs: boolean search
      systemPrompt = `Tu es un expert en requêtes de recherche booléennes pour les API de news. 
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
      
      userPrompt = `Transforme cette requête simple en requête booléenne complexe (langue: ${language}):\n\n"${query}"\n\nRéponds UNIQUEMENT avec la requête enrichie, sans explications.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
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

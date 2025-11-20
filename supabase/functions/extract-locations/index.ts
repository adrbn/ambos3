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
    const { articles } = await req.json();
    
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ locations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    // Préparer le contenu des articles pour l'analyse - SEULEMENT les métadonnées de source
    const articlesText = articles.slice(0, 10).map((article: any, idx: number) => {
      let text = `Article ${idx + 1}:\nSource Name: ${article.source?.name || 'Unknown'}`;
      
      // Pour les posts OSINT, ajouter les infos d'auteur qui indiquent la localisation de la source
      if (article.osint) {
        if (article.author) text += `\nAuthor: ${article.author}`;
        if (article.author_location) text += `\nAuthor Location: ${article.author_location}`;
        if (article.location) text += `\nPost Location: ${article.location}`;
      }
      
      // Pour la presse, ajouter le pays/ville de publication si disponible
      if (article.source?.country) text += `\nSource Country: ${article.source.country}`;
      if (article.source?.location) text += `\nSource Location: ${article.source.location}`;
      
      return text;
    }).join('\n\n');

    console.log('Extracting locations from articles...');

    // Call OpenAI to extract locations
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a geographic source location extraction expert. Your task is to identify ONLY the geographic origin of the SOURCE (publication, journal, author, organization) - NOT locations mentioned in content.

IMPORTANT RULES:
- Extract ONLY the location where the source/author/publication is based
- DO NOT extract locations mentioned in article titles or descriptions
- For news sources: identify the publication's headquarters or main location
- For OSINT posts: identify the author's location if available
- If source location cannot be determined, skip that article
- One location per source maximum

Provide accurate coordinates for source locations only.`
          },
          {
            role: 'user',
            content: `Extract ONLY the geographic location of the SOURCE (publisher/author) for each article/post - NOT locations mentioned in content:\n\n${articlesText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_locations',
              description: 'Extract ONLY source locations (where publisher/author is based) - NOT content locations',
              parameters: {
                type: 'object',
                properties: {
                  locations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the source location (city, country)' },
                        lat: { type: 'number', description: 'Latitude coordinate' },
                        lng: { type: 'number', description: 'Longitude coordinate' },
                        relevance: { type: 'string', description: 'The name of the source (publisher/author/organization)' }
                      },
                      required: ['name', 'lat', 'lng', 'relevance'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['locations'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_locations' } }
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
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extraire les localisations du tool call
    let locations = [];
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      locations = args.locations || [];
    }

    console.log(`Extracted ${locations.length} locations`);

    return new Response(
      JSON.stringify({ locations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting locations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, locations: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

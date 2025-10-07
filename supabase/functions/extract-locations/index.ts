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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Préparer le contenu des articles pour l'analyse
    const articlesText = articles.slice(0, 10).map((article: any, idx: number) => 
      `Article ${idx + 1}:\nTitle: ${article.title}\nDescription: ${article.description || ''}\nSource: ${article.source?.name || 'Unknown'}`
    ).join('\n\n');

    console.log('Extracting locations from articles...');

    // Appeler Lovable AI avec tool calling pour extraire les localisations
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a geographic location extraction expert. Extract all mentioned locations (cities, countries, regions) from news articles and provide their approximate coordinates.'
          },
          {
            role: 'user',
            content: `Extract geographic locations mentioned in these articles and provide their coordinates:\n\n${articlesText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_locations',
              description: 'Extract geographic locations with coordinates from the articles',
              parameters: {
                type: 'object',
                properties: {
                  locations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the location (city, country, region)' },
                        lat: { type: 'number', description: 'Latitude coordinate' },
                        lng: { type: 'number', description: 'Longitude coordinate' },
                        relevance: { type: 'string', description: 'Why this location is relevant to the article' }
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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
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

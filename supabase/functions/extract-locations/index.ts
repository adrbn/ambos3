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
    const { articles, sourceType } = await req.json();
    
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

    // Logique différente selon le type de source
    let articlesText: string;
    let systemPrompt: string;
    let userPrompt: string;
    
    if (sourceType === 'osint') {
      // Pour OSINT: extraire les lieux ÉVOQUÉS dans le contenu
      articlesText = articles.slice(0, 10).map((article: any, idx: number) => {
        let text = `Post ${idx + 1}:`;
        if (article.title) text += `\nTitle: ${article.title}`;
        if (article.description) text += `\nContent: ${article.description}`;
        if (article.author) text += `\nAuthor: ${article.author}`;
        return text;
      }).join('\n\n');

      systemPrompt = `You are a geopolitical intelligence analyst. Extract LOCATIONS MENTIONED in OSINT content (social media posts, discussions).

IMPORTANT RULES:
- Extract locations that are DISCUSSED/MENTIONED in the content (not where the author is from)
- Focus on: military bases, countries, cities, regions, strategic locations mentioned
- If a political figure is mentioned, identify their associated location (e.g., French PM = Paris)
- Provide accurate coordinates for each mentioned location
- Each post can have multiple relevant locations if several places are discussed
- These locations represent WHERE things are happening according to OSINT discussions`;

      userPrompt = `Extract all relevant geographic locations MENTIONED/DISCUSSED in these OSINT posts:\n\n${articlesText}`;
      
    } else {
      // Pour la presse: extraire les lieux SOURCE (origine de la publication)
      articlesText = articles.slice(0, 10).map((article: any, idx: number) => {
        let text = `Article ${idx + 1}:\nSource Name: ${article.source?.name || 'Unknown'}`;
        if (article.source?.country) text += `\nSource Country: ${article.source.country}`;
        if (article.source?.location) text += `\nSource Location: ${article.source.location}`;
        return text;
      }).join('\n\n');

      systemPrompt = `You are a geographic source location extraction expert. Your task is to identify ONLY the geographic origin of the SOURCE (publication, journal, organization) - NOT locations mentioned in content.

IMPORTANT RULES:
- Extract ONLY the location where the source/publication is based
- DO NOT extract locations mentioned in article content
- For news sources: identify the publication's headquarters or main location
- If source location cannot be determined, skip that article
- One location per source maximum
- Provide accurate coordinates for source locations only`;

      userPrompt = `Extract ONLY the geographic location of the SOURCE (publisher) for each article - NOT content locations:\n\n${articlesText}`;
    }

    console.log(`Extracting locations from articles (mode: ${sourceType})...`);

    // Appeler Lovable AI avec tool calling pour extraire les localisations
    const toolDescription = sourceType === 'osint' 
      ? 'Extract locations MENTIONED/DISCUSSED in OSINT content'
      : 'Extract ONLY source locations (where publisher is based) - NOT content locations';

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_locations',
              description: toolDescription,
              parameters: {
                type: 'object',
                properties: {
                  locations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the location (city, country, military base, region)' },
                        lat: { type: 'number', description: 'Latitude coordinate' },
                        lng: { type: 'number', description: 'Longitude coordinate' },
                        relevance: { type: 'string', description: sourceType === 'osint' ? 'Brief description of why this location is mentioned' : 'The name of the source (publisher/organization)' }
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

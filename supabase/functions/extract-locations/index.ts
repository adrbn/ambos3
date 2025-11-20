import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Enhanced retry with exponential backoff for 503 and 429 errors
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(`API ${response.status} error, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const waitTime = Math.pow(2, attempt) * 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
}

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

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
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

    const systemPrompt = `You are a geographic source location extraction expert. Your task is to identify ONLY the geographic origin of the SOURCE (publication, journal, author, organization) - NOT locations mentioned in content.

IMPORTANT RULES:
- Extract ONLY the location where the source/author/publication is based
- DO NOT extract locations mentioned in article titles or descriptions
- For news sources: identify the publication's headquarters or main location
- For OSINT posts: identify the author's location if available
- If source location cannot be determined, skip that article
- One location per source maximum

Provide accurate coordinates for source locations only.`;

    const userContent = `Extract ONLY the geographic location of the SOURCE (publisher/author) for each article/post - NOT locations mentioned in content:\n\n${articlesText}`;

    // Call Gemini to extract locations
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + userContent }]
            }
          ],
          tools: [
            {
              functionDeclarations: [
                {
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
                          required: ['name', 'lat', 'lng', 'relevance']
                        }
                      }
                    },
                    required: ['locations']
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Gemini rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Gemini Response received');

    // Extract locations from function call
    let locations = [];
    if (data.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
      const functionCall = data.candidates[0].content.parts[0].functionCall;
      if (functionCall.name === 'extract_locations' && functionCall.args) {
        locations = functionCall.args.locations || [];
      }
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

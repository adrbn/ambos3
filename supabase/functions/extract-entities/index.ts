import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Retry utility with exponential backoff  
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const waitTime = Math.pow(2, attempt) * 1000;
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
        JSON.stringify({ nodes: [], links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    // Préparer le contenu des articles pour l'analyse (limited to 10 to reduce load)
    const articlesText = articles.slice(0, 10).map((article: any, idx: number) => 
      `Article ${idx + 1}:\nTitle: ${article.title}\nDescription: ${article.description || ''}\nContent: ${article.content?.substring(0, 500) || ''}`
    ).join('\n\n');

    console.log(`Extracting entities and relationships from ${Math.min(articles.length, 10)} articles...`);

    const systemPrompt = `You are an expert OSINT analyst specializing in entity extraction and strategic relationship mapping. 

CRITICAL INSTRUCTIONS:
- Extract ONLY entities mentioned MULTIPLE times or CENTRAL to the narrative
- For PERSONS: Find official photos (Wikipedia, government sites, news sources) and include titles/positions
- Assign INFLUENCE SCORES based on political/military/strategic importance
- Map HIERARCHICAL relationships (chain of command, organizational structure)
- Map POLITICAL relationships (alliances, oppositions, diplomatic ties)
- Map GEOGRAPHICAL relationships (operational zones, bases, territories)
- Determine relationship DIRECTIONALITY (A commands B is directional, A allied with B is bidirectional)
- Calculate STRENGTH based on: co-mention frequency, strategic importance, directness of connection

Focus on geopolitical and military intelligence value.`;

    const userContent = `Extract key entities and their strategic relationships from these articles. For each person, try to find their photo URL from Wikipedia or official sources:\n\n${articlesText}`;

    // Call Gemini to extract entities and relationships
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
                  name: 'extract_entity_graph',
                  description: 'Extract entities and their relationships to build a knowledge graph',
                  parameters: {
                    type: 'object',
                    properties: {
                      nodes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', description: 'Unique entity identifier' },
                            name: { type: 'string', description: 'Entity name' },
                            type: { type: 'string', enum: ['person', 'organization', 'location', 'event'], description: 'Entity type' },
                            description: { type: 'string', description: 'Brief entity description with title/position if person' },
                            importance: { type: 'number', description: 'Strategic importance score 1-10' },
                            influence: { type: 'number', description: 'Political/military influence score 1-10' },
                            image: { type: 'string', description: 'Photo URL from Wikipedia or official source (for persons)' }
                          },
                          required: ['id', 'name', 'type', 'description', 'importance', 'influence']
                        }
                      },
                      links: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            source: { type: 'string', description: 'Source entity ID' },
                            target: { type: 'string', description: 'Target entity ID' },
                            type: { type: 'string', description: 'Relationship type (commands, allied_with, opposes, located_in, etc.)' },
                            strength: { type: 'number', description: 'Relationship strength 1-10 based on co-mentions and strategic importance' },
                            bidirectional: { type: 'boolean', description: 'True if relationship is bidirectional (alliances), false if directional (commands)' }
                          },
                          required: ['source', 'target', 'type', 'strength', 'bidirectional']
                        }
                      }
                    },
                    required: ['nodes', 'links']
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
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

    // Extract graph from function call
    let nodes = [];
    let links = [];
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
      const functionCall = data.candidates[0].content.parts[0].functionCall;
      if (functionCall.name === 'extract_entity_graph' && functionCall.args) {
        nodes = functionCall.args.nodes || [];
        links = functionCall.args.links || [];
      }
    }

    console.log(`Extracted ${nodes.length} nodes and ${links.length} links`);

    return new Response(
      JSON.stringify({ nodes, links }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting entities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, nodes: [], links: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    const systemPrompt = `You are an expert OSINT analyst extracting entities and relationships from articles for strategic intelligence analysis.

CRITICAL INSTRUCTIONS:
1. Extract ONLY entities explicitly named in articles (no generic categories)
2. For each entity, provide SPECIFIC details from articles (titles, roles, affiliations)
3. Build relationships based on ACTUAL article content (co-mentions, interactions, hierarchies)

ENTITY TYPES:
- person: Named individuals (politicians, military leaders, executives) - INCLUDE exact title/position from articles
- organization: Named groups (military units, companies, agencies, alliances)
- location: Specific places (cities, military bases, regions, countries)
- event: Named events (operations, summits, conflicts, programs)

IMPORTANCE SCORING (1-10):
- 9-10: Primary actors/decisions mentioned across multiple articles
- 7-8: Secondary actors with clear strategic relevance
- 5-6: Supporting actors mentioned in specific contexts
- 3-4: Background mentions with minimal strategic value
(Filter out entities below 5)

RELATIONSHIP STRENGTH (1-10):
- 8-10: Direct hierarchical/operational relationships (commands, controls, operates)
- 6-7: Strong strategic connections (allied_with, partners_with, supplies)
- 4-5: Moderate connections (located_in, participates_in, opposes)
- 1-3: Weak associations (mentioned_with, related_to)
(Filter out relationships below 4)

RELATIONSHIP TYPES (use exact terms):
- commands, controls, leads (directional)
- allied_with, partners_with, collaborates_with (bidirectional)
- opposes, competes_with, conflicts_with (bidirectional)
- part_of, subsidiary_of, member_of (directional)
- located_in, based_in, operates_in (directional)
- supplies, equips, supports (directional)

IMAGE URLS: For persons, find Wikipedia or official government photo URLs.

Focus on strategic military, geopolitical, and economic intelligence value.`;

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

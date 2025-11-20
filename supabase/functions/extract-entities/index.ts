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
        JSON.stringify({ nodes: [], links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Préparer le contenu des articles pour l'analyse
    const articlesText = articles.slice(0, 15).map((article: any, idx: number) => 
      `Article ${idx + 1}:\nTitle: ${article.title}\nDescription: ${article.description || ''}\nContent: ${article.content?.substring(0, 500) || ''}`
    ).join('\n\n');

    console.log('Extracting entities and relationships from articles...');

    // Call OpenAI to extract entities and relationships
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert OSINT analyst specializing in entity extraction and strategic relationship mapping. 

CRITICAL INSTRUCTIONS:
- Extract ONLY entities mentioned MULTIPLE times or CENTRAL to the narrative
- For PERSONS: Find official photos (Wikipedia, government sites, news sources) and include titles/positions
- Assign INFLUENCE SCORES based on political/military/strategic importance
- Map HIERARCHICAL relationships (chain of command, organizational structure)
- Map POLITICAL relationships (alliances, oppositions, diplomatic ties)
- Map GEOGRAPHICAL relationships (operational zones, bases, territories)
- Determine relationship DIRECTIONALITY (A commands B is directional, A allied with B is bidirectional)
- Calculate STRENGTH based on: co-mention frequency, strategic importance, directness of connection

Focus on geopolitical and military intelligence value.`
          },
          {
            role: 'user',
            content: `Extract key entities and their strategic relationships from these articles. For each person, try to find their photo URL from Wikipedia or official sources:\n\n${articlesText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_entity_graph',
              description: 'Extract entities and their relationships to build a knowledge graph',
              parameters: {
                type: 'object',
                properties: {
                  nodes: {
                    type: 'array',
                    description: 'Entities found in the articles',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Unique identifier for the entity' },
                        name: { type: 'string', description: 'Name of the entity' },
                        type: { 
                          type: 'string', 
                          enum: ['person', 'organization', 'location', 'event', 'date'],
                          description: 'Type of entity' 
                        },
                        importance: { 
                          type: 'number', 
                          description: 'Importance score from 1-10 based on frequency, centrality, and relevance',
                          minimum: 1,
                          maximum: 10
                        },
                        description: { type: 'string', description: 'Brief description of the entity and their role' },
                        image_url: { type: 'string', description: 'URL to a photo/image of the entity (for persons: Wikipedia, official sites; for organizations: logo)' },
                        title: { type: 'string', description: 'Official title or position (e.g., "Minister of Defense", "CEO")' },
                        country: { type: 'string', description: 'Country or nationality associated with this entity' },
                        influence_score: { 
                          type: 'number', 
                          description: 'Political/strategic influence score 1-10 based on position and reach',
                          minimum: 1,
                          maximum: 10
                        }
                      },
                      required: ['id', 'name', 'type', 'importance'],
                      additionalProperties: false
                    }
                  },
                  links: {
                    type: 'array',
                    description: 'Relationships between entities',
                    items: {
                      type: 'object',
                      properties: {
                        source: { type: 'string', description: 'ID of the source entity' },
                        target: { type: 'string', description: 'ID of the target entity' },
                        relationship: { 
                          type: 'string', 
                          description: 'Type of relationship: hierarchical (reports_to, commands), organizational (works_for, member_of), political (supports, opposes, allied_with), geographical (based_in, operates_in), temporal (preceded_by, caused)'
                        },
                        strength: { 
                          type: 'number', 
                          description: 'Relationship strength 1-10: frequency of co-mention, directness of link, strategic importance',
                          minimum: 1,
                          maximum: 10
                        },
                        direction: {
                          type: 'string',
                          enum: ['bidirectional', 'directional'],
                          description: 'Whether the relationship goes both ways or is one-directional'
                        }
                      },
                      required: ['source', 'target', 'relationship', 'strength'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['nodes', 'links'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_entity_graph' } }
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
          JSON.stringify({ error: 'Payment required. Please add credits to your OpenAI account.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extraire le graphe du tool call
    let graph = { nodes: [], links: [] };
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      graph = {
        nodes: args.nodes || [],
        links: args.links || []
      };
    }

    console.log(`Extracted ${graph.nodes.length} nodes and ${graph.links.length} links`);

    return new Response(
      JSON.stringify(graph),
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

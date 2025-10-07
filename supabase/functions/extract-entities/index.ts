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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Préparer le contenu des articles pour l'analyse
    const articlesText = articles.slice(0, 15).map((article: any, idx: number) => 
      `Article ${idx + 1}:\nTitle: ${article.title}\nDescription: ${article.description || ''}\nContent: ${article.content?.substring(0, 500) || ''}`
    ).join('\n\n');

    console.log('Extracting entities and relationships from articles...');

    // Appeler Lovable AI avec tool calling pour extraire les entités et liens
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
            content: 'You are an expert in entity extraction and relationship mapping for news analysis. Extract people, organizations, locations, and events, then identify meaningful relationships between them.'
          },
          {
            role: 'user',
            content: `Extract entities (people, organizations, locations, events) and their relationships from these articles:\n\n${articlesText}`
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
                          description: 'Importance score from 1-10',
                          minimum: 1,
                          maximum: 10
                        },
                        description: { type: 'string', description: 'Brief description of the entity' }
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
                        source: { type: 'string', description: 'Source entity ID' },
                        target: { type: 'string', description: 'Target entity ID' },
                        relationship: { type: 'string', description: 'Type of relationship' },
                        strength: { 
                          type: 'number', 
                          description: 'Strength of relationship from 1-10',
                          minimum: 1,
                          maximum: 10
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

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
    const { query } = await req.json();
    console.log('Fetching from Gopher AI with query:', query);

    const GOPHER_API_KEY = Deno.env.get('GOPHER_API_KEY');
    if (!GOPHER_API_KEY) {
      throw new Error('GOPHER_API_KEY not configured');
    }

    // Gopher AI unified search endpoint
    const response = await fetch('https://data.gopher-ai.com/api/v1/search/live', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'twitter',
        arguments: {
          type: 'searchbyquery',
          query: query,
          max_results: 50,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gopher API error:', response.status, errorText);
      throw new Error(`Gopher API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw Gopher API response:', JSON.stringify(data).substring(0, 500));
    
    // Gopher can return: an array, an object with data[], or a job uuid to poll
    let results: any[] = [];
    if (Array.isArray(data)) {
      results = data;
      console.log('Gopher returned array directly with', results.length, 'results');
    } else if (data && Array.isArray((data as any).data)) {
      results = (data as any).data;
      console.log('Gopher returned object with data property containing', results.length, 'results');
    } else if (data && (data as any).uuid) {
      const uuid = (data as any).uuid as string;
      console.log('Gopher returned job uuid, polling results for', uuid);
      const MAX_TRIES = 8;
        const pollUrls = [
          `https://data.gopher-ai.com/api/v1/search/live/result/${uuid}`,
          `https://data.gopher-ai.com/api/v1/search/live/twitter/result/${uuid}`,
        ];
        for (let i = 0; i < MAX_TRIES; i++) {
          let gotResults = false;
          for (const pollUrl of pollUrls) {
            const res2 = await fetch(pollUrl, {
              headers: {
                'Authorization': `Bearer ${GOPHER_API_KEY}`,
                'Accept': 'application/json',
              }
            });
            if (!res2.ok) {
              const t = await res2.text();
              console.warn('Gopher result poll error', res2.status, t.substring(0, 300));
              continue; // try next poll URL
            } else {
              const data2 = await res2.json();
              console.log('Gopher poll response snippet:', JSON.stringify(data2).substring(0, 400));
              if (Array.isArray(data2)) {
                results = data2;
                gotResults = true;
                break;
              }
              if (data2 && Array.isArray((data2 as any).data)) {
                results = (data2 as any).data;
                gotResults = true;
                break;
              }
              if ((data2 as any)?.status === 'done' && Array.isArray((data2 as any).data)) {
                results = (data2 as any).data;
                gotResults = true;
                break;
              }
            }
          }
          if (gotResults) break;
          // wait 1s before next poll
          await new Promise((r) => setTimeout(r, 1000));
        }
        console.log('Polling finished, results:', Array.isArray(results) ? results.length : 0);
    } else {
      console.log('Gopher returned unexpected format:', typeof data);
      results = [];
    }

    // Transform Gopher results to our article format
    const articles = results.map((item: any) => {
      const content = item.content || '';
      const metadata = item.metadata || {};
      const username = metadata.username || 'Unknown';
      const publicMetrics = metadata.public_metrics || {};
      
      return {
        title: content.substring(0, 100) || 'Sans titre',
        description: content,
        url: `https://twitter.com/${username}/status/${item.id}`,
        publishedAt: metadata.created_at || new Date().toISOString(),
        source: {
          name: `X/Twitter - @${username}`,
          platform: 'twitter',
        },
        author: username,
        content: content,
        osint: true,
        platform: 'twitter',
        engagement: {
          likes: publicMetrics.like_count || 0,
          shares: publicMetrics.retweet_count || 0,
          comments: publicMetrics.reply_count || 0,
        },
      };
    });

    return new Response(
      JSON.stringify({ articles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-gopher function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        articles: [] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

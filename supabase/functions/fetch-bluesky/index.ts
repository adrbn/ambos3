import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bluesky ATP API endpoint (no authentication needed for public search)
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts';

interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    viewer?: any;
    labels?: any[];
  };
  record: {
    text: string;
    createdAt: string;
    embed?: any;
    facets?: any[];
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}

interface CredibilityFactors {
  accountAge: number;
  engagement: number;
  verification: boolean;
  contentQuality: number;
}

function calculateCredibilityScore(post: BlueskyPost): { score: number; factors: CredibilityFactors } {
  let score = 50; // Base score
  const factors: CredibilityFactors = {
    accountAge: 0,
    engagement: 0,
    verification: false,
    contentQuality: 50,
  };

  // Engagement quality (0-25 points)
  const totalEngagement = post.likeCount + post.repostCount + post.replyCount;
  if (totalEngagement > 100) {
    factors.engagement = 25;
    score += 25;
  } else if (totalEngagement > 50) {
    factors.engagement = 15;
    score += 15;
  } else if (totalEngagement > 10) {
    factors.engagement = 10;
    score += 10;
  } else {
    factors.engagement = 5;
    score += 5;
  }

  // Verification/labels (0-15 points)
  if (post.author.labels && post.author.labels.length > 0) {
    factors.verification = true;
    score += 15;
  }

  // Content quality based on length and structure (0-10 points)
  const textLength = post.record.text.length;
  if (textLength > 200 && textLength < 500) {
    factors.contentQuality = 60;
    score += 10;
  } else if (textLength > 100) {
    factors.contentQuality = 55;
    score += 5;
  }

  // Cap at 100
  return {
    score: Math.min(score, 100),
    factors,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, language, limit = 50 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Bluesky posts for query: "${query}" in language: ${language}`);

    // Build Bluesky search URL
    const searchUrl = new URL(BLUESKY_API);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('limit', limit.toString());
    
    // Add language hint if available
    if (language === 'fr') {
      searchUrl.searchParams.append('lang', 'fr');
    } else if (language === 'en') {
      searchUrl.searchParams.append('lang', 'en');
    } else if (language === 'it') {
      searchUrl.searchParams.append('lang', 'it');
    }

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bluesky API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Bluesky API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const posts: BlueskyPost[] = data.posts || [];

    console.log(`Found ${posts.length} Bluesky posts`);

    // Normalize Bluesky posts to article format with credibility scoring
    const articles = posts.map((post) => {
      const credibility = calculateCredibilityScore(post);
      const postUrl = `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`;

      return {
        title: post.record.text.substring(0, 100) + (post.record.text.length > 100 ? '...' : ''),
        description: post.record.text,
        content: post.record.text,
        url: postUrl,
        image: post.author.avatar || post.record.embed?.images?.[0]?.thumb || null,
        publishedAt: post.record.createdAt,
        source: {
          name: `@${post.author.handle}`,
          id: post.author.did,
        },
        author: post.author.displayName || post.author.handle,
        // OSINT-specific fields
        osint: {
          platform: 'bluesky',
          credibilityScore: credibility.score,
          credibilityFactors: credibility.factors,
          engagement: {
            likes: post.likeCount,
            reposts: post.repostCount,
            replies: post.replyCount,
          },
          verified: credibility.factors.verification,
          originalPost: post,
        },
      };
    });

    return new Response(
      JSON.stringify({
        articles,
        totalResults: posts.length,
        api: 'bluesky',
        sourceType: 'osint',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-bluesky function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

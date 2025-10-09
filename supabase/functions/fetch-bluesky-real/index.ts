const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BlueSky (AT Protocol) public API - App View
const BLUESKY_API = 'https://api.bsky.app';

interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    indexedAt: string;
  };
  record: {
    text: string;
    createdAt: string;
    langs?: string[];
  };
  embed?: any;
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

  // Account age (0-10 points)
  const accountAge = new Date().getTime() - new Date(post.author.indexedAt).getTime();
  const ageInDays = accountAge / (1000 * 60 * 60 * 24);
  if (ageInDays > 365) {
    factors.accountAge = 10;
    score += 10;
  } else if (ageInDays > 180) {
    factors.accountAge = 5;
    score += 5;
  }

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

  // Verification proxy - accounts with descriptions get points
  if (post.author.description) {
    factors.verification = true;
    score += 10;
  }

  // Content quality based on length (0-10 points)
  const textLength = post.record.text.length;
  if (textLength > 200 && textLength < 1000) {
    factors.contentQuality = 60;
    score += 10;
  } else if (textLength > 100) {
    factors.contentQuality = 55;
    score += 5;
  }

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
    const { query, language, limit = 40 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BlueSky doesn't use hashtags - clean them if present
    const cleanQuery = query.replace(/#/g, '').trim();

    console.log(`Fetching BlueSky posts for query: "${cleanQuery}"${language ? ` in language: ${language}` : ''}`);

    const searchUrl = new URL(`${BLUESKY_API}/xrpc/app.bsky.feed.searchPosts`);
    searchUrl.searchParams.append('q', cleanQuery);
    searchUrl.searchParams.append('limit', Math.min(limit, 100).toString());
    
    if (language) {
      searchUrl.searchParams.append('lang', language);
    }

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BlueSky API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `BlueSky API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const posts: BlueskyPost[] = data.posts || [];

    console.log(`Received ${posts.length} posts from BlueSky API`);

    // Normalize BlueSky posts to article format with credibility scoring
    const articles = posts.map((post) => {
      const credibility = calculateCredibilityScore(post);
      const contentText = post.record.text.trim();
      const postUrl = `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`;
      
      // Detect if this is actually a BlueSky post by checking the handle
      const isBlueSky = post.author.handle.includes('.bsky.social') || 
                        post.author.handle.includes('bsky.brid.gy') ||
                        post.uri.includes('did:plc:');

      return {
        title: contentText.substring(0, 100) + (contentText.length > 100 ? '...' : ''),
        description: contentText,
        content: contentText,
        url: postUrl,
        image: post.author.avatar || null,
        publishedAt: post.record.createdAt,
        source: {
          name: `@${post.author.handle}`,
          id: post.author.did,
        },
        author: post.author.displayName || post.author.handle,
        // OSINT-specific fields
        osint: {
          platform: isBlueSky ? 'bluesky' : 'mastodon',
          credibilityScore: credibility.score,
          credibilityFactors: credibility.factors,
          engagement: {
            likes: post.likeCount,
            reposts: post.repostCount,
            replies: post.replyCount,
          },
          verified: credibility.factors.verification,
          accountMetrics: {
            handle: post.author.handle,
            accountAge: post.author.indexedAt,
          },
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
        cursor: data.cursor,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-bluesky-real function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mastodon API endpoints (no authentication needed for public timelines)
const MASTODON_INSTANCE = 'https://mastodon.social';
const MASTODON_PUBLIC_API = `${MASTODON_INSTANCE}/api/v1/timelines/public`;
const MASTODON_TAG_API = `${MASTODON_INSTANCE}/api/v1/timelines/tag`;

interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  bot: boolean;
  created_at: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
}

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  url: string;
  account: MastodonAccount;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  media_attachments: any[];
}

interface CredibilityFactors {
  accountAge: number;
  engagement: number;
  verification: boolean;
  contentQuality: number;
}

function calculateCredibilityScore(status: MastodonStatus): { score: number; factors: CredibilityFactors } {
  let score = 50; // Base score
  const factors: CredibilityFactors = {
    accountAge: 0,
    engagement: 0,
    verification: false,
    contentQuality: 50,
  };

  // Account age (0-10 points)
  const accountAge = new Date().getTime() - new Date(status.account.created_at).getTime();
  const ageInDays = accountAge / (1000 * 60 * 60 * 24);
  if (ageInDays > 365) {
    factors.accountAge = 10;
    score += 10;
  } else if (ageInDays > 180) {
    factors.accountAge = 5;
    score += 5;
  }

  // Engagement quality (0-25 points)
  const totalEngagement = status.favourites_count + status.reblogs_count + status.replies_count;
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

  // Bot check (verification proxy) - real accounts get points
  if (!status.account.bot) {
    factors.verification = true;
    score += 10;
  }

  // Account influence (followers/following ratio and activity)
  const followRatio = status.account.followers_count / Math.max(status.account.following_count, 1);
  if (followRatio > 2 && status.account.followers_count > 100) {
    score += 5;
  }

  // Content quality based on length (0-10 points)
  const contentText = status.content.replace(/<[^>]*>/g, ''); // Strip HTML
  const textLength = contentText.length;
  if (textLength > 200 && textLength < 1000) {
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
    const { query, language, limit = 40 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Mastodon posts for query: "${query}"${language ? ` in language: ${language}` : ''}`);

    // Extract hashtag if present (with or without #)
    const hashtagMatch = query.match(/#?(\w+)/);
    const isHashtagSearch = query.startsWith('#') || query.includes('#');
    
    let searchUrl: URL;
    
    if (isHashtagSearch && hashtagMatch) {
      // Use hashtag timeline API (more reliable for public access)
      const hashtag = hashtagMatch[1]; // Extract without #
      searchUrl = new URL(`${MASTODON_TAG_API}/${hashtag}`);
      console.log(`Using hashtag API for: ${hashtag}`);
    } else {
      // Use public timeline API and filter client-side
      searchUrl = new URL(MASTODON_PUBLIC_API);
      console.log('Using public timeline API');
    }
    
    searchUrl.searchParams.append('limit', limit.toString());

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mastodon API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Mastodon API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    // Timeline API returns array directly, not wrapped in object
    let statuses: MastodonStatus[] = Array.isArray(data) ? data : (data.statuses || []);

    // Filter by query text if using public timeline (client-side filtering)
    if (!isHashtagSearch && query) {
      const queryLower = query.toLowerCase();
      statuses = statuses.filter(status => {
        const content = status.content.toLowerCase();
        const account = status.account.display_name.toLowerCase() + ' ' + status.account.username.toLowerCase();
        return content.includes(queryLower) || account.includes(queryLower);
      });
    }

    console.log(`Found ${statuses.length} Mastodon posts`);

    // Normalize Mastodon posts to article format with credibility scoring
    const articles = statuses.map((status) => {
      const credibility = calculateCredibilityScore(status);
      const contentText = status.content.replace(/<[^>]*>/g, '').trim(); // Strip HTML tags

      return {
        title: contentText.substring(0, 100) + (contentText.length > 100 ? '...' : ''),
        description: contentText,
        content: contentText,
        url: status.url,
        image: status.media_attachments[0]?.preview_url || status.account.avatar || null,
        publishedAt: status.created_at,
        source: {
          name: `@${status.account.acct}`,
          id: status.account.id,
        },
        author: status.account.display_name || status.account.username,
        // OSINT-specific fields
        osint: {
          platform: 'mastodon',
          credibilityScore: credibility.score,
          credibilityFactors: credibility.factors,
          engagement: {
            likes: status.favourites_count,
            reposts: status.reblogs_count,
            replies: status.replies_count,
          },
          verified: credibility.factors.verification,
          accountMetrics: {
            followers: status.account.followers_count,
            following: status.account.following_count,
            posts: status.account.statuses_count,
            accountAge: status.account.created_at,
          },
          originalPost: status,
        },
      };
    });

    return new Response(
      JSON.stringify({
        articles,
        totalResults: statuses.length,
        api: 'mastodon',
        sourceType: 'osint',
        instance: MASTODON_INSTANCE,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-bluesky function (now Mastodon):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

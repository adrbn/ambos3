import { useState } from "react";
import { Filter, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";
import { ArticleListSkeleton } from "@/components/LoadingSkeleton";

interface DataFeedModuleProps {
  articles: any[];
  language: Language;
  isLoading?: boolean;
}

const DataFeedModule = ({ articles, language, isLoading = false }: DataFeedModuleProps) => {
  const [filter, setFilter] = useState<'all' | 'recent' | 'trending' | 'twitter' | 'bluesky' | 'mastodon' | 'press'>('all');
  const { t } = useTranslation(language);

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500/50 bg-green-500/10";
    if (score >= 50) return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
    return "text-red-500 border-red-500/50 bg-red-500/10";
  };

  const detectPlatform = (article: any): string => {
    // First check if article has a platform property directly (from backend)
    if (article.platform) {
      return article.platform;
    }
    // Check if osint.platform is available
    if (article.osint?.platform) {
      return article.osint.platform;
    }
    // Check for Twitter/X
    if (article.source?.name?.toLowerCase().includes('twitter') ||
        article.source?.name?.toLowerCase().includes('x/twitter') ||
        article.source?.platform === 'twitter' ||
        article.url?.includes('twitter.com')) {
      return 'twitter';
    }
    // Check URL for Bluesky
    if (article.url?.includes('bsky.app') || article.url?.includes('bsky.brid.gy')) {
      return 'bluesky';
    }
    // Check source name for Bluesky
    if (article.source?.name?.includes('bsky.social') || article.source?.name?.includes('bsky.brid.gy')) {
      return 'bluesky';
    }
    // Check for Mastodon
    if (article.source?.name?.toLowerCase().includes('mastodon') || article.url?.includes('mastodon')) {
      return 'mastodon';
    }
    // Default to news for non-OSINT posts
    return article.osint ? 'unknown' : 'news';
  };

  const truncateUrl = (url: string, maxLength: number = 45) => {
    if (url.length <= maxLength) return url;
    const half = Math.floor((maxLength - 3) / 2);
    return url.slice(0, half) + '...' + url.slice(-half);
  };

  const getFilteredArticles = () => {
    let filtered = articles;
    
    if (filter === 'recent') {
      const now = Date.now();
      filtered = articles.filter(article => {
        const articleDate = new Date(article.publishedAt).getTime();
        const hoursDiff = (now - articleDate) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });
    } else if (filter === 'trending') {
      filtered = articles.filter(article => {
        const engagement = article.engagement || article.osint?.engagement;
        if (!engagement) return false;
        return (engagement.likes || 0) > 50 || 
               (engagement.shares || engagement.reposts || 0) > 20 ||
               (engagement.comments || engagement.replies || 0) > 10;
      });
    } else if (filter === 'twitter') {
      filtered = articles.filter(article => detectPlatform(article) === 'twitter');
    } else if (filter === 'bluesky') {
      filtered = articles.filter(article => detectPlatform(article) === 'bluesky');
    } else if (filter === 'mastodon') {
      filtered = articles.filter(article => detectPlatform(article) === 'mastodon');
    } else if (filter === 'press') {
      filtered = articles.filter(article => !article.osint);
    }
    
    return filtered;
  };

  const filteredArticles = getFilteredArticles();

  if (isLoading) {
    return (
      <div className="hud-panel h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="alert-indicator"></span>
            {t('dataFeed').toUpperCase()}
          </h2>
          <Filter className="w-3 h-3 text-primary/70" />
        </div>
        <ArticleListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="alert-indicator"></span>
          {t('dataFeed').toUpperCase()}
        </h2>
        <Filter className="w-3 h-3 text-primary/70" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs h-7"
            >
              {t('allFeeds')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Afficher tous les articles</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('recent')}
              className="text-xs h-7"
            >
              {t('recent')} (&lt;24h)
            </Button>
          </TooltipTrigger>
          <TooltipContent>Articles des dernières 24 heures</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filter === 'trending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('trending')}
              className="text-xs h-7"
            >
              {t('trending')} (🔥)
            </Button>
          </TooltipTrigger>
          <TooltipContent>Articles avec fort engagement</TooltipContent>
        </Tooltip>
        <div className="w-px h-5 bg-border mx-1"></div>
        <Button
          variant={filter === 'press' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('press')}
          className="text-xs h-7"
        >
          📰 Presse
        </Button>
        <Button
          variant={filter === 'twitter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('twitter')}
          className="text-xs h-7"
        >
          𝕏 Twitter
        </Button>
        <Button
          variant={filter === 'bluesky' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('bluesky')}
          className="text-xs h-7"
        >
          🦋 Bluesky
        </Button>
        <Button
          variant={filter === 'mastodon' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('mastodon')}
          className="text-xs h-7"
        >
          🐘 Mastodon
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article, index) => {
            const isOsint = article.osint !== undefined;
            const credibilityScore = article.osint?.credibilityScore || article.credibilityScore || 0;
            const platform = detectPlatform(article);
            
            return (
              <div
                key={index}
                className="p-3 bg-card/30 border border-primary/20 rounded hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 flex-1">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOsint && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 ${getCredibilityColor(credibilityScore)}`}
                      >
                        {credibilityScore}%
                      </Badge>
                    )}
                    <TrendingUp className="w-3 h-3 text-secondary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {article.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-primary/70">{article.source?.name || 'Unknown'}</span>
                    {article.webResult && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-semibold">
                        WEB
                      </span>
                    )}
                    {isOsint && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <Badge variant="secondary" className="text-xs py-0">
                          {platform === 'twitter' && '𝕏 Twitter'}
                          {platform === 'bluesky' && '🦋 BlueSky'}
                          {platform === 'mastodon' && '🐘 Mastodon'}
                          {platform === 'unknown' && '🔍 OSINT'}
                        </Badge>
                        {article.osint?.verified && (
                          <span className="text-green-500 text-xs">✓</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(article.publishedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-secondary transition-colors"
                      title={article.url}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                {isOsint && article.osint.engagement && (
                  <div className="mt-2 pt-2 border-t border-primary/10 flex gap-3 text-xs text-muted-foreground">
                    <span>❤️ {article.osint.engagement.likes}</span>
                    <span>🔄 {article.osint.engagement.reposts}</span>
                    <span>💬 {article.osint.engagement.replies}</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            {t('noFeedData')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFeedModule;

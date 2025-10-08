import { useState } from "react";
import { Filter, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface DataFeedModuleProps {
  articles: any[];
  language: Language;
}

const DataFeedModule = ({ articles, language }: DataFeedModuleProps) => {
  const [filter, setFilter] = useState<string>('all');
  const { t } = useTranslation(language);

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500/50 bg-green-500/10";
    if (score >= 50) return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
    return "text-red-500 border-red-500/50 bg-red-500/10";
  };

  const filters = [
    { id: 'all', label: t('allFeeds') },
    { id: 'recent', label: t('recent') },
    { id: 'trending', label: t('trending') },
  ];

  const getFilteredArticles = () => {
    if (filter === 'recent') {
      return [...articles].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ).slice(0, 10);
    }
    return articles;
  };

  const filteredArticles = getFilteredArticles();

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="alert-indicator"></span>
          {t('dataFeed').toUpperCase()}
        </h2>
        <Filter className="w-3 h-3 text-primary/70" />
      </div>

      <div className="flex gap-2 mb-3">
        {filters.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.id)}
            className={`
              text-xs px-3 py-1 font-mono
              ${filter === f.id 
                ? 'bg-primary text-primary-foreground border-glow' 
                : 'bg-card/50 text-primary/70 hover:text-primary border-primary/30'
              }
            `}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article, index) => {
            const isOsint = article.osint !== undefined;
            const credibilityScore = article.osint?.credibilityScore || 0;
            
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
                    {isOsint && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <Badge variant="secondary" className="text-xs py-0">
                          {article.osint.platform === 'mastodon' ? '🐘 Mastodon' : article.osint.platform}
                        </Badge>
                        {article.osint.verified && (
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

import { useState } from "react";
import { Filter, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataFeedModuleProps {
  articles: any[];
}

const DataFeedModule = ({ articles }: DataFeedModuleProps) => {
  const [filter, setFilter] = useState<string>('all');

  const filters = [
    { id: 'all', label: 'ALL FEEDS' },
    { id: 'recent', label: 'RECENT' },
    { id: 'trending', label: 'TRENDING' },
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-primary text-glow flex items-center gap-2">
          <span className="alert-indicator"></span>
          LIVE INTELLIGENCE FEED
        </h2>
        <Filter className="w-4 h-4 text-primary/70" />
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
          filteredArticles.map((article, index) => (
            <div
              key={index}
              className="p-3 bg-card/30 border border-primary/20 rounded hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-xs font-semibold text-foreground line-clamp-2 flex-1">
                  {article.title}
                </h3>
                <TrendingUp className="w-3 h-3 text-secondary flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {article.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary/70">{article.source?.name || 'Unknown'}</span>
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
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No feed data available
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFeedModule;

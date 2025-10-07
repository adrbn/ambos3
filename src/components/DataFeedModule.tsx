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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="alert-indicator"></span>
          ARTICLES DES MÉDIAS
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filteredArticles.length} articles</span>
          <Filter className="w-3 h-3 text-primary/70" />
        </div>
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
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-card/30 border border-primary/20 rounded hover:border-primary/40 hover:bg-card/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <ExternalLink className="w-3 h-3 text-primary/50 group-hover:text-primary flex-shrink-0 transition-colors" />
              </div>
              {article.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                  {article.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-primary font-mono font-semibold">
                  {article.source?.name || 'Unknown Source'}
                </span>
                <span className="text-muted-foreground font-mono">
                  {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </a>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <Filter className="w-8 h-8 opacity-50" />
            <p>Aucun article trouvé</p>
            <p className="text-xs">Effectuez une recherche pour voir les articles des médias</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFeedModule;

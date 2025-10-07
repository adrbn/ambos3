import { Clock, ExternalLink } from "lucide-react";

interface TimelineModuleProps {
  articles: any[];
}

const TimelineModule = ({ articles }: TimelineModuleProps) => {
  // Group articles by date
  const groupedByDate = articles.reduce((acc: any, article: any) => {
    const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(article);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-sm font-bold text-primary mb-3 text-glow flex items-center gap-2">
        <span className="alert-indicator"></span>
        INTELLIGENCE TIMELINE
      </h2>

      {articles.length > 0 ? (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="border-l-2 border-primary/30 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3 h-3 text-secondary" />
                <h3 className="text-xs font-bold text-secondary uppercase">{date}</h3>
              </div>
              <div className="space-y-2">
                {groupedByDate[date].map((article: any, index: number) => (
                  <div
                    key={index}
                    className="p-2 bg-card/30 border border-primary/20 rounded hover:border-primary/40 transition-all group"
                  >
                    <h4 className="text-xs font-semibold text-foreground mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{article.source?.name || 'Unknown'}</span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-secondary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No timeline data yet
        </div>
      )}
    </div>
  );
};

export default TimelineModule;

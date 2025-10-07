import { TrendingUp, AlertTriangle, Info } from "lucide-react";

interface Prediction {
  scenario: string;
  probability: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface Sentiment {
  public: string;
  experts: string;
}

interface PredictiveAnalysisProps {
  predictions: Prediction[];
  sentiment: Sentiment | null;
  summary: string;
}

const PredictiveAnalysis = ({ predictions, sentiment, summary }: PredictiveAnalysisProps) => {
  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-secondary';
      case 'low': return 'text-primary';
      default: return 'text-foreground';
    }
  };

  const getProbabilityIcon = (prob: string) => {
    switch (prob) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-sm font-bold text-primary mb-3 text-glow flex items-center gap-2">
        <span className="alert-indicator"></span>
        AI INTELLIGENCE ANALYSIS
      </h2>

      {summary && (
        <div className="mb-4 p-3 bg-card/30 border border-primary/20 rounded">
          <h3 className="text-xs font-bold text-secondary mb-2 uppercase">Summary</h3>
          <p className="text-xs text-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {predictions && predictions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-secondary mb-2 uppercase">Predictions</h3>
          <div className="space-y-2">
            {predictions.map((pred, index) => (
              <div
                key={index}
                className="p-3 bg-card/30 border border-primary/20 rounded hover:border-primary/40 transition-all"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={getProbabilityColor(pred.probability)}>
                    {getProbabilityIcon(pred.probability)}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-foreground">{pred.scenario}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-mono uppercase ${getProbabilityColor(pred.probability)}`}>
                        {pred.probability} probability
                      </span>
                      <span className="text-xs text-muted-foreground">• {pred.timeframe}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentiment && (
        <div>
          <h3 className="text-xs font-bold text-secondary mb-2 uppercase">Sentiment Analysis</h3>
          <div className="space-y-2">
            <div className="p-2 bg-card/30 border border-primary/20 rounded">
              <p className="text-xs text-muted-foreground mb-1">Public Opinion</p>
              <p className="text-xs text-foreground">{sentiment.public}</p>
            </div>
            <div className="p-2 bg-card/30 border border-primary/20 rounded">
              <p className="text-xs text-muted-foreground mb-1">Expert Views</p>
              <p className="text-xs text-foreground">{sentiment.experts}</p>
            </div>
          </div>
        </div>
      )}

      {!predictions && !sentiment && !summary && (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No analysis available yet
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalysis;

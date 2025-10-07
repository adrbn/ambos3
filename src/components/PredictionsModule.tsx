import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface Prediction {
  scenario: string;
  probability: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface Sentiment {
  public: string;
  experts: string;
}

interface PredictionsModuleProps {
  predictions: Prediction[];
  sentiment: Sentiment | null;
  language: Language;
}

const PredictionsModule = ({ predictions, sentiment, language }: PredictionsModuleProps) => {
  const { t } = useTranslation(language);
  
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
      <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
        <span className="alert-indicator"></span>
        {t('predictions').toUpperCase()}
      </h2>

      {predictions && predictions.length > 0 && (
        <div className="mb-4">
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
                        {t(`${pred.probability}Probability`)}
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
          <h3 className="text-xs font-bold text-secondary mb-2 uppercase">{t('sentimentAnalysis')}</h3>
          <div className="space-y-2">
            <div className="p-2 bg-card/30 border border-primary/20 rounded">
              <p className="text-xs text-muted-foreground mb-1">{t('publicOpinion')}</p>
              <p className="text-xs text-foreground">{sentiment.public}</p>
            </div>
            <div className="p-2 bg-card/30 border border-primary/20 rounded">
              <p className="text-xs text-muted-foreground mb-1">{t('expertViews')}</p>
              <p className="text-xs text-foreground">{sentiment.experts}</p>
            </div>
          </div>
        </div>
      )}

      {!predictions && !sentiment && (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          {t('noPredictions')}
        </div>
      )}
    </div>
  );
};

export default PredictionsModule;

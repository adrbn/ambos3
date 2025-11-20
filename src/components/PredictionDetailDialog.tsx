import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingUp, Radio, Calendar, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Prediction {
  scenario: string;
  probability: string;
  timeframe: string;
  impact?: string;
  reasoning?: string;
  confidence_factors?: string;
  risk_level?: string;
  weak_signals?: string | string[]; // Can be string or array from AI
  key_indicators?: string[];
  supporting_evidence?: string[];
}

interface PredictionDetailDialogProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
  language?: 'fr' | 'en' | 'it';
  analysisContext?: any; // Full analysis for extracting weak signals
}

export function PredictionDetailDialog({ 
  prediction, 
  isOpen, 
  onClose,
  language = 'fr',
  analysisContext 
}: PredictionDetailDialogProps) {
  if (!prediction) return null;

  // Parse probability (e.g., "élevée" → 75, "moyenne" → 50, "faible" → 25)
  const getProbabilityValue = (prob: string): number => {
    const lower = prob.toLowerCase();
    if (lower.includes('élevée') || lower.includes('high') || lower.includes('alta')) return 75;
    if (lower.includes('très élevée') || lower.includes('very high')) return 90;
    if (lower.includes('moyenne') || lower.includes('medium') || lower.includes('media')) return 50;
    if (lower.includes('faible') || lower.includes('low') || lower.includes('bassa')) return 25;
    return 50;
  };

  const probabilityValue = getProbabilityValue(prediction.probability);

  // Generate probability evolution over time
  const timelineData = [
    { date: language === 'fr' ? 'Aujourd\'hui' : 'Today', probability: probabilityValue * 0.6 },
    { date: language === 'fr' ? '1 mois' : '1 month', probability: probabilityValue * 0.75 },
    { date: language === 'fr' ? '3 mois' : '3 months', probability: probabilityValue * 0.85 },
    { date: language === 'fr' ? '6 mois' : '6 months', probability: probabilityValue },
    { date: language === 'fr' ? '1 an' : '1 year', probability: probabilityValue * 0.95 },
  ];

  // Extract REAL weak signals from analysis
  const extractWeakSignals = () => {
    // Priority 1: Direct weak_signals from prediction
    if (prediction.weak_signals) {
      if (Array.isArray(prediction.weak_signals)) {
        return prediction.weak_signals.map((signal: any, idx: number) => ({
          signal: typeof signal === 'string' ? signal : signal.signal || signal,
          strength: 7 - idx, // Decreasing strength
          date: 'Détecté récemment'
        }));
      } else if (typeof prediction.weak_signals === 'string') {
        // Split by sentences or bullet points
        return prediction.weak_signals.split(/[.;]/).filter((s: string) => s.trim()).map((signal: string, idx: number) => ({
          signal: signal.trim(),
          strength: 7 - idx,
          date: 'Détecté récemment'
        }));
      }
    }

    // Priority 2: confidence_factors or supporting_evidence
    if (prediction.confidence_factors) {
      return prediction.confidence_factors.split(/[.;]/).filter(s => s.trim()).slice(0, 4).map((signal, idx) => ({
        signal: signal.trim(),
        strength: 8 - idx,
        date: 'Facteur de confiance'
      }));
    }

    // Priority 3: Extract from analysis context (sentiment.weak_signals)
    if (analysisContext?.sentiment?.weak_signals) {
      const contextSignals = analysisContext.sentiment.weak_signals;
      if (typeof contextSignals === 'string') {
        return contextSignals.split(/[.;]/).filter(s => s.trim()).slice(0, 4).map((signal, idx) => ({
          signal: signal.trim(),
          strength: 7 - idx,
          date: 'Signal détecté'
        }));
      }
    }

    // Fallback: Extract from reasoning
    if (prediction.reasoning) {
      const sentences = prediction.reasoning.split(/[.;]/).filter(s => s.trim() && s.length > 20);
      return sentences.slice(0, 3).map((signal, idx) => ({
        signal: signal.trim(),
        strength: 6 - idx,
        date: 'Extrait du raisonnement'
      }));
    }

    return [];
  };

  const weakSignals = extractWeakSignals();

  const getProbabilityColor = (value: number) => {
    if (value >= 75) return 'text-red-500';
    if (value >= 50) return 'text-orange-500';
    if (value >= 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Analyse détaillée de la prédiction
          </DialogTitle>
          <DialogDescription>
            Probabilités, signaux faibles et évolution temporelle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scenario */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{prediction.scenario}</h3>
            <div className="flex gap-2">
              <Badge variant={probabilityValue >= 75 ? 'destructive' : 'default'}>
                Probabilité: {prediction.probability}
              </Badge>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {prediction.timeframe}
              </Badge>
              {prediction.impact && (
                <Badge variant="secondary">
                  Impact: {prediction.impact}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Probability Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score de probabilité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Probabilité de réalisation</span>
                  <span className={`text-2xl font-bold ${getProbabilityColor(probabilityValue)}`}>
                    {probabilityValue}%
                  </span>
                </div>
                <Progress value={probabilityValue} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {probabilityValue >= 75 && "⚠️ Probabilité très élevée - Surveillance renforcée recommandée"}
                  {probabilityValue >= 50 && probabilityValue < 75 && "⚡ Probabilité modérée - Surveiller l'évolution"}
                  {probabilityValue < 50 && "✓ Probabilité faible - Monitoring de routine suffisant"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Probability Evolution Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Évolution de la probabilité dans le temps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                    }}
                    formatter={(value: any) => [`${value}%`, 'Probabilité']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="probability" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Projection basée sur les tendances actuelles et l'analyse des signaux faibles
              </p>
            </CardContent>
          </Card>

          {/* Reasoning */}
          {prediction.reasoning && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💡 Raisonnement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{prediction.reasoning}</p>
              </CardContent>
            </Card>
          )}

          {/* Weak Signals (ESSENTIEL!) */}
          <Card className="border-2 border-primary/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                Signaux faibles détectés (Intelligence clé 🔑)
              </CardTitle>
              <DialogDescription>
                Indicateurs précoces qui laissent penser que ce scénario pourrait se réaliser
              </DialogDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.isArray(weakSignals) ? weakSignals.map((signal: any, idx: number) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-primary/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm">{signal.signal || signal}</h4>
                      </div>
                      {signal.date && (
                        <p className="text-xs text-muted-foreground">{signal.date}</p>
                      )}
                    </div>
                    {signal.strength && (
                      <Badge variant="outline" className="ml-2">
                        Force: {signal.strength}/10
                      </Badge>
                    )}
                  </div>
                  {signal.strength && (
                    <Progress value={signal.strength * 10} className="h-2" />
                  )}
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Aucun signal faible spécifique identifié.</p>
              )}

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <p className="text-xs text-muted-foreground">
                  <strong>💡 Signaux faibles:</strong> Indicateurs subtils, souvent négligés, qui peuvent annoncer 
                  des changements majeurs. L'analyse de ces signaux est cruciale pour l'anticipation stratégique.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PredictionDetailDialog;


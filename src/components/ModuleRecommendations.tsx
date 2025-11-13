import { useEffect, useState } from "react";
import { Lightbulb, Calendar, BarChart3, Map, Network } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface ModuleRecommendation {
  module: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
}

interface ModuleRecommendationsProps {
  articles: any[];
  analysis: any;
  language: Language;
  onModuleRequest?: (module: string) => void;
}

const ModuleRecommendations = ({ articles, analysis, language, onModuleRequest }: ModuleRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<ModuleRecommendation[]>([]);
  const { t } = useTranslation(language);

  useEffect(() => {
    if (!analysis || !articles || articles.length === 0) return;

    const recs: ModuleRecommendation[] = [];

    // Détection d'événements → Calendrier
    const hasEvents = articles.some((a: any) => 
      a.title?.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) ||
      a.description?.toLowerCase().includes('event') ||
      a.description?.toLowerCase().includes('conférence') ||
      a.description?.toLowerCase().includes('sommet') ||
      analysis.keyEntities?.some((e: any) => e.type === 'event')
    );

    if (hasEvents) {
      recs.push({
        module: 'calendar',
        reason: language === 'fr' 
          ? "Des événements et dates importantes ont été détectés dans votre recherche"
          : "Important events and dates detected in your search",
        priority: 'high',
        icon: Calendar
      });
    }

    // Beaucoup d'entités → Graphe enrichi déjà disponible mais on peut recommander d'y regarder
    const entityCount = analysis.keyEntities?.length || 0;
    if (entityCount > 10) {
      recs.push({
        module: 'network-graph',
        reason: language === 'fr'
          ? `${entityCount} entités clés détectées - le graphe relationnel peut révéler des connexions importantes`
          : `${entityCount} key entities detected - the network graph may reveal important connections`,
        priority: 'medium',
        icon: Network
      });
    }

    // Données géographiques importantes → Map
    const hasGeo = analysis.locations?.length > 5;
    if (hasGeo) {
      recs.push({
        module: 'map',
        reason: language === 'fr'
          ? "Forte dimension géographique détectée - la carte peut aider à visualiser la répartition territoriale"
          : "Strong geographical dimension detected - the map can help visualize territorial distribution",
        priority: 'medium',
        icon: Map
      });
    }

    // Tendances temporelles → Timeline déjà disponible mais on peut suggérer
    const hasTimeline = articles.some((a: any) => {
      const pubDate = new Date(a.publishedAt || a.published_at);
      return !isNaN(pubDate.getTime());
    });

    if (hasTimeline && articles.length > 8) {
      recs.push({
        module: 'timeline',
        reason: language === 'fr'
          ? "Évolution temporelle détectée - la timeline peut montrer la progression des événements"
          : "Temporal evolution detected - the timeline can show event progression",
        priority: 'low',
        icon: BarChart3
      });
    }

    setRecommendations(recs);
  }, [articles, analysis, language]);

  if (recommendations.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-destructive/50 bg-destructive/10';
      case 'medium': return 'border-secondary/50 bg-secondary/10';
      case 'low': return 'border-primary/50 bg-primary/10';
      default: return 'border-border';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4" />
        {language === 'fr' ? 'MODULES RECOMMANDÉS' : 'RECOMMENDED MODULES'}
      </h2>

      <div className="space-y-2">
        {recommendations.map((rec, idx) => {
          const Icon = rec.icon;
          return (
            <Card 
              key={idx}
              className={`p-3 border ${getPriorityColor(rec.priority)} hover:border-primary/60 transition-all cursor-pointer`}
              onClick={() => onModuleRequest?.(rec.module)}
            >
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground uppercase">
                      {rec.module.replace('-', ' ')}
                    </span>
                    <Badge variant={getPriorityBadge(rec.priority)} className="text-[10px] px-1 py-0">
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-3 p-2 bg-primary/5 rounded border border-primary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            {language === 'fr' 
              ? "💡 L'IA a analysé vos résultats pour suggérer ces modules"
              : "💡 AI analyzed your results to suggest these modules"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ModuleRecommendations;

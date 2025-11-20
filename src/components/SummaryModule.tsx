import { useState } from "react";
import { FileText, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface KeyPoint {
  point: string;
  details: string;
}

interface SummaryModuleProps {
  summary: string;
  keyPoints?: KeyPoint[];
  articles: any[];
  query: string;
  language: Language;
  onRegenerate?: (newSummary: string, newKeyPoints?: KeyPoint[]) => void;
}

const SummaryModule = ({ summary, keyPoints, articles, query, language, onRegenerate }: SummaryModuleProps) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { t } = useTranslation(language);

  const handleRegenerate = async () => {
    if (!articles || articles.length === 0) {
      toast.error("No articles to analyze");
      return;
    }

    setIsRegenerating(true);
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles, query, language }
      });

      if (analysisError) throw analysisError;
      
      if (analysisData && onRegenerate) {
        onRegenerate(analysisData.summary, analysisData.key_points);
        toast.success("Summary regenerated");
      }
    } catch (error: any) {
      console.error('Regeneration error:', error);
      toast.error("Failed to regenerate summary");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Clean markdown formatting with safety check
  const cleanText = (text: string | undefined) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+/g, '');
  };

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t('summary').toUpperCase()}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating || !articles || articles.length === 0}
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-auto space-y-4">
        {/* High-level summary */}
        {summary && (
          <p className="text-sm text-foreground/90 leading-relaxed">
            {cleanText(summary)}
          </p>
        )}

        {/* Key points with hover details */}
        {keyPoints && keyPoints.length > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wide">
                {language === 'fr' ? 'Points Clés' : language === 'it' ? 'Punti Chiave' : 'Key Points'}
              </h3>
              <ul className="space-y-2">
                {keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2 group">
                    <span className="text-primary/60 text-xs mt-0.5 flex-shrink-0">•</span>
                    <div className="flex items-start gap-1.5 flex-1">
                      <span className="text-sm text-foreground leading-relaxed flex-1">
                        {cleanText(kp.point)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex-shrink-0 mt-0.5 hover:bg-primary/10 rounded p-0.5 transition-colors">
                            <Info className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="left" 
                          className="max-w-md p-3 bg-background/95 backdrop-blur-sm border-primary/20"
                          sideOffset={5}
                        >
                          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {cleanText(kp.details)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipProvider>
        )}

        {/* Fallback for old format */}
        {!summary && !keyPoints && (
          <p className="text-sm text-foreground/70">{t('noArticles')}</p>
        )}
      </div>
    </div>
  );
};

export default SummaryModule;

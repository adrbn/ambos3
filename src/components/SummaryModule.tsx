import { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface SummaryModuleProps {
  summary: string;
  articles: any[];
  query: string;
  language: Language;
  onRegenerate?: (newSummary: string) => void;
}

const SummaryModule = ({ summary, articles, query, language, onRegenerate }: SummaryModuleProps) => {
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
        onRegenerate(analysisData.summary);
        toast.success("Summary regenerated");
      }
    } catch (error: any) {
      console.error('Regeneration error:', error);
      toast.error("Failed to regenerate summary");
    } finally {
      setIsRegenerating(false);
    }
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
      <div className="flex-1 overflow-auto">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {summary ? summary.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+/g, '') : t('noArticles')}
        </p>
      </div>
    </div>
  );
};

export default SummaryModule;

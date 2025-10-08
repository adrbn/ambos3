import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";
import { FunctionsHttpError } from '@supabase/supabase-js'; // Importation essentielle pour le décodage d'erreur

interface SearchBarProps {
  onSearch: (query: string, articles: any[], analysis: any) => void;
  language: Language;
  currentQuery: string;
  searchTrigger: number;
  selectedApi: 'gnews' | 'newsapi' | 'mediastack';
}

const SearchBar = ({ onSearch, language, currentQuery, searchTrigger, selectedApi }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation(language);

  // Sync query with currentQuery prop
  useEffect(() => {
    if (currentQuery) {
      setQuery(currentQuery);
    }
  }, [currentQuery]);

  // Auto-search when language changes and we have a query
  useEffect(() => {
    if (searchTrigger > 0 && currentQuery) {
      handleSearch(currentQuery);
    }
  }, [searchTrigger]);

  const handleSearch = async (searchQuery?: string) => {
    const queryToUse = searchQuery || query;
    if (!queryToUse.trim()) {
      toast.error("Veuillez entrer une requête de recherche.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Appel de la fonction Edge 'fetch-news'
      const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-news', {
        body: { query: queryToUse, language, api: selectedApi }
      });

      // GESTION D'ERREUR NON-2XX (Status Code d'erreur de la fonction Edge : 4xx, 5xx)
      if (newsError) {
        if (newsError instanceof FunctionsHttpError) {
          let errorMessage: string;
          
          try {
            // Tenter de lire le corps JSON
            const errorBody = await newsError.context.json();
            errorMessage = errorBody.error || errorBody.message || `Erreur Serveur (${newsError.context.status || '??'}): Corps décodé.`;
            
          } catch (e) {
            // Si la lecture JSON échoue (corps déjà lu ou non-JSON)
            // On essaie de lire le corps en texte, ou on utilise le statut par défaut
            try {
                const errorText = await newsError.context.text();
                errorMessage = `Erreur de la fonction Edge (${newsError.context.status}): ${errorText || 'Réponse illisible.'}`;
            } catch (textReadError) {
                // Si la lecture texte échoue également (body stream already read)
                errorMessage = `Erreur de la fonction Edge: Le flux de réponse a été lu. Code: ${newsError.context.status}. Vérifiez les logs Supabase.`;
            }
            
            console.error('Erreur Edge Function (Lecture/Décodage):', newsError, e);
          }
          
          toast.error(errorMessage);
          throw new Error(errorMessage); // Lance l'erreur pour la gestion globale

        } else {
          // Erreur réseau ou autre
          throw newsError; 
        }
      }
      // FIN GESTION D'ERREUR NON-2XX


      // 2. Gestion des erreurs retournées dans le corps (Statut 200, mais contenu est une erreur)
      if (newsData?.error) {
        toast.error(newsData.error, {
          duration: newsData.isRateLimitError ? 10000 : 6000
        });
        console.error('Erreur API (gestion interne):', newsData);
        setIsLoading(false);
        return;
      }

      // 3. Gestion de l'absence d'articles
      if (!newsData?.articles || newsData.articles.length === 0) {
        const errorMsg = newsData?.totalArticles > 0
          ? "Articles trouvés mais non disponibles (plus de 30 jours). Essayez des sujets d'actualité plus récents !"
          : "Aucun article trouvé. Essayez d'autres mots-clés.";
        toast.error(errorMsg, { duration: 6000 });
        console.error('Aucun article retourné:', newsData);
        setIsLoading(false);
        return;
      }

      toast.success(`Trouvé ${newsData.articles.length} articles`);

      // 4. Analyse des articles avec l'IA
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles: newsData.articles, query: queryToUse, language }
      });

      if (analysisError) {
        console.error('Erreur d\'analyse:', analysisError);
        toast.error("Échec de l'analyse des articles.");
        onSearch(queryToUse, newsData.articles, null);
      } else {
        toast.success("Analyse IA terminée.");
        onSearch(queryToUse, newsData.articles, analysisData);
      }
    } catch (error: any) {
      // Catch final pour toutes les erreurs lancées
      console.error('Échec de la recherche (Catch final):', error);
      toast.error(error.message || "La recherche a échoué.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={isLoading}
          className="w-full h-10 pl-10 pr-4 bg-card/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:border-glow font-mono text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
      </div>
      <Button
        onClick={() => handleSearch()}
        disabled={isLoading}
        data-search-button
        className="w-full hud-button h-10 text-xs px-4"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            {t('searching')}
          </>
        ) : (
          t('searchButton')
        )}
      </Button>
    </div>
  );
};

export default SearchBar;

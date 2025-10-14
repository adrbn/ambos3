import { useState, useEffect } from "react";
import { Loader2, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface SearchBarProps {
  onSearch: (query: string, articles: any[], analysis: any) => void;
  language: Language;
  currentQuery: string;
  searchTrigger: number;
  selectedApi: 'gnews' | 'newsapi' | 'mediastack' | 'mixed';
  sourceType: 'news' | 'osint';
  onSourceTypeChange: (type: 'news' | 'osint') => void;
  osintSources: string[];
  onOsintSourcesChange: (sources: string[]) => void;
  enableQueryEnrichment: boolean;
}

const SearchBar = ({ onSearch, language, currentQuery, searchTrigger, selectedApi, sourceType, onSourceTypeChange, osintSources, onOsintSourcesChange, enableQueryEnrichment }: SearchBarProps) => {
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
      // 1. Enrichir la requête via ChatGPT (adapté au type de source) - SEULEMENT SI ACTIVÉ ET EN MODE NEWS
      let finalQuery = queryToUse;
      
      if (enableQueryEnrichment && sourceType === 'news') {
        toast.info("Enrichissement de la requête...", { duration: 2000 });
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke('enrich-query', {
          body: { query: queryToUse, language, sourceType, osintPlatforms: osintSources }
        });

        if (enrichError || !enrichData?.enrichedQuery) {
          console.error('Erreur enrichissement:', enrichError);
          toast.warning("Enrichissement échoué, utilisation de la requête simple");
        } else {
          finalQuery = enrichData.enrichedQuery;
          toast.success(`Requête enrichie : ${finalQuery.substring(0, 80)}...`, { duration: 3000 });
        }
      }

      // 2. Fetch from selected sources
      let allArticles: any[] = [];
      
      if (sourceType === 'osint' && osintSources.length === 0) {
        toast.error("Veuillez sélectionner au moins une source OSINT.");
        setIsLoading(false);
        return;
      }
      
      if (sourceType === 'osint') {
        // Fetch from multiple OSINT sources in parallel
        const fetchPromises = osintSources.map(async (source) => {
          const functionMap: Record<string, string> = {
            'mastodon': 'fetch-bluesky',
            'bluesky': 'fetch-bluesky-real',
            'gopher': 'fetch-gopher',
            'google': 'fetch-google',
            'military-rss': 'fetch-military-rss',
          };
          
          const functionName = functionMap[source];
          if (!functionName) return { articles: [] };
          
          try {
            const { data, error } = await supabase.functions.invoke(functionName, {
              body: { query: finalQuery, language, limit: 50 }
            });
            
            if (error) {
              console.error(`Error fetching from ${source}:`, error);
              toast.error(`Erreur ${source}: ${error.message}`);
              return { articles: [] };
            }
            
            // Check for error in response data
            if (data?.error) {
              console.error(`${source} returned error:`, data);
              toast.warning(`${source}: ${data.error}`);
              return { articles: [] };
            }
            
            return data || { articles: [] };
          } catch (err) {
            console.error(`Exception fetching from ${source}:`, err);
            return { articles: [] };
          }
        });
        
        const results = await Promise.all(fetchPromises);
        allArticles = results.flatMap(result => result.articles || []);
        
        if (allArticles.length === 0) {
          toast.error("Aucun article trouvé sur les sources sélectionnées.");
          setIsLoading(false);
          return;
        }
      } else {
        // Fetch from news API
        const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-news', {
          body: { query: finalQuery, language, api: selectedApi }
        });
        
        if (newsError) {
          throw newsError;
        }
        
        if (newsData?.error) {
          toast.error(newsData.error, {
            duration: newsData.isRateLimitError ? 10000 : 6000
          });
          setIsLoading(false);
          return;
        }
        
        allArticles = newsData?.articles || [];
      }
      
      // 3. Gestion de l'absence d'articles
      if (allArticles.length === 0) {
        toast.error(`Aucun post trouvé. Essayez d'autres mots-clés ou sources.`, { duration: 6000 });
        setIsLoading(false);
        return;
      }

      toast.success(`Trouvé ${allArticles.length} post${allArticles.length > 1 ? 's' : ''} sur ${sourceType === 'osint' ? osintSources.join(', ') : 'news APIs'}`);

      // 4. Analyse des articles avec l'IA
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles: allArticles, query: queryToUse, language, sourceType }
      });

      if (analysisError) {
        console.error('Erreur d\'analyse:', analysisError);
        toast.error("Échec de l'analyse des articles.");
        onSearch(queryToUse, allArticles, null);
      } else {
        toast.success("Analyse IA terminée.");
        onSearch(queryToUse, allArticles, analysisData);
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
    <div className="w-full space-y-3">
      {/* Source Type Toggle */}
      <div className="flex gap-2 p-1 bg-card/30 rounded-lg border border-primary/20">
        <button
          onClick={() => onSourceTypeChange('news')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-mono transition-all ${
            sourceType === 'news'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          📰 {t('newsApis')}
        </button>
        
        <div className="flex flex-1 gap-1">
          <button
            onClick={() => onSourceTypeChange('osint')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-mono transition-all ${
              sourceType === 'osint'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            🔍 OSINT
          </button>
          
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`px-2 py-2 rounded-md text-xs transition-all border border-primary/30 ${
                  sourceType === 'osint'
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card/70'
                }`}
              >
                <Settings2 className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-card border-primary/30 p-3" align="end">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono mb-2">Sources OSINT actives:</p>
                <div className="flex flex-col gap-2">
                  {['mastodon', 'bluesky', 'gopher', 'google', 'military-rss'].map((source) => {
                    const sourceLabels: Record<string, string> = {
                      'mastodon': 'Mastodon',
                      'bluesky': 'BlueSky',
                      'gopher': 'X/Twitter',
                      'google': 'Google',
                      'military-rss': '🇮🇹 Military RSS (IT)'
                    };
                    
                    return (
                      <label
                        key={source}
                        className="flex items-center gap-2 px-3 py-2 rounded bg-card/30 border border-primary/20 cursor-pointer hover:bg-card/50 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={osintSources.includes(source)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onOsintSourcesChange([...osintSources, source]);
                            } else {
                              onOsintSourcesChange(osintSources.filter(s => s !== source));
                            }
                          }}
                          className="w-3 h-3"
                        />
                        <span className="text-xs font-mono flex-1">
                          {sourceLabels[source]}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  ⚠️ Threads nécessite OAuth et validation d'app (non disponible)
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

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

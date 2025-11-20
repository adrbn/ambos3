import { useState, useEffect } from "react";
import { Loader2, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";
import SearchLoadingAnimation from "@/components/SearchLoadingAnimation";
import { MilitarySourcesConfig } from "@/components/MilitarySourcesConfig";

interface MilitarySource {
  name: string;
  url: string;
  language: string;
  enabled: boolean;
}

interface SearchBarProps {
  onSearch: (query: string, articles: any[], analysis: any) => void;
  language: Language;
  currentQuery: string;
  searchTrigger: number;
  selectedApi: 'gnews' | 'newsapi' | 'mediastack' | 'mixed';
  sourceMode: 'news' | 'osint' | 'military';
  onSourceModeChange: (type: 'news' | 'osint' | 'military') => void;
  osintSources: string[];
  onOsintSourcesChange: (sources: string[]) => void;
  pressSources: string[];
  onPressSourcesChange: (sources: string[]) => void;
  militarySources: MilitarySource[];
  onMilitarySourcesChange: (sources: MilitarySource[]) => void;
  enableQueryEnrichment: boolean;
}

const SearchBar = ({ onSearch, language, currentQuery, searchTrigger, selectedApi, sourceMode, onSourceModeChange, osintSources, onOsintSourcesChange, pressSources, onPressSourcesChange, militarySources, onMilitarySourcesChange, enableQueryEnrichment }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation(language);

  useEffect(() => {
    if (currentQuery) {
      setQuery(currentQuery);
    }
  }, [currentQuery]);

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
      let finalQuery = queryToUse;
      
      // Traduction automatique vers l'italien pour les flux militaires si la langue n'est pas IT
      if (sourceMode === 'military' && language !== 'it') {
        try {
          const { data: translateData, error: translateError } = await supabase.functions.invoke('enrich-query', {
            body: { 
              query: queryToUse, 
              language: 'it', 
              sourceType: 'news',
              translateOnly: true
            }
          });
          
          if (!translateError && translateData?.translatedQuery) {
            finalQuery = translateData.translatedQuery;
            toast.info(`Requête traduite en italien: "${finalQuery}"`, { duration: 3000 });
          }
        } catch (err) {
          console.error('Translation error:', err);
        }
      }
      
      // Enrichissement optionnel (tous modes si activé)
      if (enableQueryEnrichment) {
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke('enrich-query', {
          body: { query: finalQuery, language: sourceMode === 'military' ? 'it' : language, sourceType: sourceMode === 'military' ? 'news' : sourceMode, osintPlatforms: osintSources }
        });

        if (!enrichError && enrichData?.enrichedQuery) {
          finalQuery = enrichData.enrichedQuery;
        }
      }

      let allArticles: any[] = [];
      
      if (sourceMode === 'osint' && osintSources.length === 0) {
        toast.error("Veuillez sélectionner au moins une source OSINT.");
        setIsLoading(false);
        return;
      }
      
      if (sourceMode === 'military') {
        // Filtrer uniquement les sources activées
        const enabledSources = militarySources.filter(s => s.enabled);
        
        if (enabledSources.length === 0) {
          toast.error("Aucune source militaire activée");
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('fetch-military-rss', {
          body: { 
            query: finalQuery, 
            language: 'it',
            limit: 50,
            customSources: enabledSources 
          }
        });
        
        if (error) {
          console.error('Error fetching military RSS:', error);
          toast.error("Erreur lors de la récupération des flux militaires");
          setIsLoading(false);
          return;
        }
        
        allArticles = data?.articles || [];
      } else if (sourceMode === 'osint') {
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
            
            if (error || data?.error) {
              return { articles: [] };
            }
            
            return data || { articles: [] };
          } catch {
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
        const sourcesToFetch = pressSources.filter(s => s !== 'military-rss');
        const newsPromises = sourcesToFetch.map(async (api) => {
          try {
            const { data, error } = await supabase.functions.invoke('fetch-news', {
              body: { query: finalQuery, language, api }
            });
            
            if (error || data?.error) {
              return [];
            }
            
            return data?.articles || [];
          } catch {
            return [];
          }
        });
        
        if (pressSources.includes('military-rss')) {
          const militaryPromise = supabase.functions.invoke('fetch-military-rss', {
            body: { query: finalQuery, language, limit: 50 }
          }).then(({ data, error }) => {
            if (error || !data?.articles) return [];
            return data.articles;
          });
          newsPromises.push(militaryPromise);
        }
        
        const results = await Promise.all(newsPromises);
        allArticles = results.flat();
      }
      
      if (allArticles.length === 0) {
        toast.error(`Aucun post trouvé. Essayez d'autres mots-clés ou sources.`, { duration: 6000 });
        setIsLoading(false);
        return;
      }

      const modeLabel = sourceMode === 'military' ? 'flux militaires' : sourceMode === 'osint' ? osintSources.join(', ') : 'presse';
      toast.success(`Trouvé ${allArticles.length} post${allArticles.length > 1 ? 's' : ''} sur ${modeLabel}`);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles: allArticles, query: queryToUse, language, sourceType: sourceMode === 'military' ? 'news' : sourceMode }
      });

      if (analysisError) {
        toast.error("Échec de l'analyse des articles.");
        onSearch(queryToUse, allArticles, null);
      } else {
        toast.success("Analyse IA terminée.");
        onSearch(queryToUse, allArticles, analysisData);
      }
    } catch (error: any) {
      toast.error(error.message || "La recherche a échoué.");
    } finally {
      setIsLoading(false);
    }
  };

  const showModeSelector = sourceMode !== 'military';
  const showMilitaryConfig = sourceMode === 'military';

  return (
    <div className="w-full space-y-3">
      {/* Military sources config - only in military mode */}
      {showMilitaryConfig && (
        <div className="p-3 bg-card/30 rounded-lg border border-primary/20">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono transition-all bg-card/50 hover:bg-card/70 border border-primary/30">
                <span>⚙️ Configuration des sources RSS</span>
                <Settings2 className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-card border-primary/30 p-3" align="start">
              <MilitarySourcesConfig 
                sources={militarySources}
                onSourcesChange={onMilitarySourcesChange}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      
      {showModeSelector && (
        <div className="flex gap-2 p-1 bg-card/30 rounded-lg border border-primary/20">
          <div className="flex flex-1 gap-1">
            <button
              onClick={() => onSourceModeChange('news')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-mono transition-all ${
                sourceMode === 'news'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              📰 {t('newsApis')}
            </button>
            
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`px-2 py-2 rounded-md text-xs transition-all border border-primary/30 ${
                    sourceMode === 'news'
                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card/70'
                  }`}
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-card border-primary/30 p-3" align="end">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono mb-2">Sources presse actives:</p>
                  <div className="flex flex-col gap-2">
                    {['newsapi', 'mediastack', 'gnews', 'military-rss'].map((source) => {
                      const sourceLabels: Record<string, string> = {
                        'newsapi': 'NewsAPI',
                        'mediastack': 'Mediastack',
                        'gnews': 'GNews',
                        'military-rss': '🇮🇹 Military RSS (IT)'
                      };
                      
                      return (
                        <label
                          key={source}
                          className="flex items-center gap-2 px-3 py-2 rounded bg-card/30 border border-primary/20 cursor-pointer hover:bg-card/50 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={pressSources.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onPressSourcesChange([...pressSources, source]);
                              } else {
                                onPressSourcesChange(pressSources.filter(s => s !== source));
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
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex flex-1 gap-1">
            <button
              onClick={() => onSourceModeChange('osint')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-mono transition-all ${
                sourceMode === 'osint'
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
                    sourceMode === 'osint'
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
                    ⚠️ Threads nécessite OAuth (non disponible)
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('searchPlaceholder')}
          className="flex-1 hud-input text-sm"
          disabled={isLoading}
        />
        <Button
          onClick={() => handleSearch()}
          disabled={isLoading}
          className="hud-button gap-2 text-sm"
          data-search-button
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('searching')}
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              {t('searchButton')}
            </>
          )}
        </Button>
      </div>

      {isLoading && <SearchLoadingAnimation />}
    </div>
  );
};

export default SearchBar;

import { useState, useEffect, useRef } from "react";
import { Shield, Activity, RotateCcw, Search, BookmarkPlus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SearchBar from "@/components/SearchBar";
import MapModule from "@/components/MapModule";
import GraphModule from "@/components/GraphModule";
import NetworkGraph3D from "@/components/NetworkGraph3D";
import SummaryModule from "@/components/SummaryModule";
import PredictionsModule from "@/components/PredictionsModule";
import TimelineModule from "@/components/TimelineModule";
import DataFeedModule from "@/components/DataFeedModule";
import SectorWatchesModule from "@/components/SectorWatchesModule";
import ModuleRecommendations from "@/components/ModuleRecommendations";
import SettingsDialog from "@/components/SettingsDialog";
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";
import ServiceStatusIndicator from "@/components/ServiceStatusIndicator";
import ResizableDraggableModule from "@/components/ResizableDraggableModule";
import LayoutManager from "@/components/LayoutManager";
import ReportGenerator from "@/components/ReportGenerator";
import { AppNavigationMenu } from "@/components/NavigationMenu";
import { useLayoutConfig, ModuleId } from "@/hooks/useLayoutConfig";
import { useSavedLayouts } from "@/hooks/useSavedLayouts";
import { useTranslation } from "@/hooks/useTranslation";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { Language } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, UserCog, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ApiSource = 'gnews' | 'newsapi' | 'mediastack' | 'mixed';

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<Language>("fr");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [selectedApi, setSelectedApi] = useState<ApiSource>('mixed');
  const [sourceType, setSourceType] = useState<'news' | 'osint'>('news');
  const [osintSources, setOsintSources] = useState<string[]>(['mastodon', 'bluesky', 'gopher', 'google']);
  const [theme, setTheme] = useState<'default' | 'light' | 'girly'>('default');
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToHistory, goBack, goForward, canGoBack, canGoForward } = useSearchHistory();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  const [enableQueryEnrichment, setEnableQueryEnrichment] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("search");
  const [currentWatch, setCurrentWatch] = useState<any>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
  const { t } = useTranslation(language);
  const { layout, updateLayout, resetLayout } = useLayoutConfig();
  const [moduleSizes, setModuleSizes] = useState<Record<string, { width: number; height: number }>>({});
  const {
    savedLayouts,
    saveLayout,
    getLayout,
    isLoading: layoutsLoading,
  } = useSavedLayouts();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layout.moduleOrder.indexOf(active.id as ModuleId);
      const newIndex = layout.moduleOrder.indexOf(over.id as ModuleId);
      const newOrder = arrayMove(layout.moduleOrder, oldIndex, newIndex);
      updateLayout(newOrder);
      toast.success('Layout mis à jour');
    }
  };

  const handleResetLayout = () => {
    resetLayout();
    setModuleSizes({});
    setCurrentLayoutName(null);
    toast.success('Layout réinitialisé');
  };

  const handleModuleResize = (moduleId: string, width: number, height: number) => {
    setModuleSizes(prev => ({
      ...prev,
      [moduleId]: { width, height }
    }));
  };

  const handleSaveLayout = (name: string) => {
    saveLayout(name, layout.moduleOrder, moduleSizes);
    setCurrentLayoutName(name);
    toast.success(`${t('saveLayout')} "${name}"`);
  };

  const handleLoadLayout = (name: string) => {
    const savedLayout = getLayout(name);
    if (savedLayout) {
      updateLayout(savedLayout.moduleOrder);
      setModuleSizes(savedLayout.moduleSizes);
      setCurrentLayoutName(name);
      toast.success(`${t('loadLayout')} "${name}"`);
    }
  };

  const handleSearch = (query: string, fetchedArticles: any[], analysisData: any) => {
    setCurrentQuery(query);
    setArticles(fetchedArticles);
    setAnalysis(analysisData);
    // Save to history
    addToHistory(query, fetchedArticles, analysisData, language);
    // Clear current watch if it's a manual search (not from a watch)
    if (!currentWatch || query !== currentQuery) {
      setCurrentWatch(null);
    }
  };

  const handleHistoryBack = () => {
    const previous = goBack();
    if (previous) {
      setCurrentQuery(previous.query);
      setArticles(previous.articles);
      setAnalysis(previous.analysis);
      toast.info(`Retour à: ${previous.query}`);
    }
  };

  const handleHistoryForward = () => {
    const next = goForward();
    if (next) {
      setCurrentQuery(next.query);
      setArticles(next.articles);
      setAnalysis(next.analysis);
      toast.info(`Suivant: ${next.query}`);
    }
  };

  const handleSummaryRegenerate = (newSummary: string) => {
    setAnalysis((prev: any) => prev ? { ...prev, summary: newSummary } : { summary: newSummary });
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (currentQuery) {
      // If we have a current watch, use its translated query
      if (currentWatch) {
        let queryToUse = currentWatch.query; // Default FR
        if (newLang === 'en' && currentWatch.query_en) {
          queryToUse = currentWatch.query_en;
        } else if (newLang === 'it' && currentWatch.query_it) {
          queryToUse = currentWatch.query_it;
        }
        setCurrentQuery(queryToUse);
      }
      toast.info(`${t('languageChanged')}: ${newLang.toUpperCase()}. ${t('newSearch')}`);
      setSearchTrigger(prev => prev + 1);
    }
  };

  const handleLaunchWatch = (watch: any) => {
    const targetLanguage = language; // Use current language selection
    setCurrentWatch(watch); // Store the watch for language changes
    
    // Select the appropriate query based on the current language
    let queryToUse = watch.query; // Default to FR
    if (targetLanguage === 'en' && watch.query_en) {
      queryToUse = watch.query_en;
    } else if (targetLanguage === 'it' && watch.query_it) {
      queryToUse = watch.query_it;
    }
    
    setCurrentQuery(queryToUse);
    
    // Configure source type and sources based on watch configuration
    const sourceMode = watch.source_mode || 'press';
    const pressSources = watch.press_sources || ['newsapi'];
    const osintSrcs = watch.osint_sources || [];
    
    if (sourceMode === 'press') {
      setSourceType('news');
      setActiveTab("search");
      // Set the API based on first press source if available
      if (pressSources.length > 0) {
        const firstApi = pressSources[0];
        if (['gnews', 'newsapi', 'mediastack'].includes(firstApi)) {
          setSelectedApi(firstApi as ApiSource);
        } else {
          setSelectedApi('mixed');
        }
      }
    } else if (sourceMode === 'osint') {
      setSourceType('osint');
      setActiveTab("search"); // Switch to search tab (which should have OSINT mode)
      setOsintSources(osintSrcs);
    } else if (sourceMode === 'both') {
      // For "both" mode, use mixed press sources
      setSourceType('news');
      setActiveTab("search");
      setSelectedApi('mixed');
    }
    
    toast.info(`${t('launchingWatch')}: ${watch.name} (${targetLanguage.toUpperCase()})`);
    
    // Trigger search with the watch parameters
    setTimeout(() => {
      const searchButton = document.querySelector('[data-search-button]') as HTMLButtonElement;
      if (searchButton) {
        searchButton.click();
      }
    }, 100);
  };

  const getModuleComponent = (moduleId: ModuleId) => {
    switch (moduleId) {
      case 'map':
        return <MapModule articles={articles} language={language} />;
      case 'timeline':
        return <TimelineModule articles={articles} language={language} />;
      case 'network-graph':
        return <NetworkGraph3D articles={articles} />;
      case 'entities':
        return <GraphModule entities={analysis?.entities || []} language={language} />;
      case 'summary':
        return (
          <SummaryModule 
            summary={analysis?.summary || ""} 
            articles={articles}
            query={currentQuery}
            language={language}
            onRegenerate={handleSummaryRegenerate}
          />
        );
      case 'predictions':
        return <PredictionsModule predictions={analysis?.predictions || []} sentiment={analysis?.sentiment || null} language={language} />;
      case 'datafeed':
        return <DataFeedModule articles={articles} language={language} />;
      case 'recommendations':
        return <ModuleRecommendations articles={articles} analysis={analysis} language={language} />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/50 border-b border-primary/30 px-2 sm:px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-base sm:text-xl font-black text-primary text-glow tracking-wider uppercase">
                {t('appName')}
              </h1>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            {/* History Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleHistoryBack}
                disabled={!canGoBack}
                className="h-8 px-2"
                title="Retour (Alt+←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHistoryForward}
                disabled={!canGoForward}
                className="h-8 px-2"
                title="Suivant (Alt+→)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {articles.length > 0 && (
              <ReportGenerator
                articles={articles}
                analysis={analysis}
                query={currentQuery}
                language={language}
              />
            )}
            <SettingsDialog 
              selectedApi={selectedApi} 
              onApiChange={setSelectedApi} 
              language={language}
              enableQueryEnrichment={enableQueryEnrichment}
              onEnableQueryEnrichmentChange={setEnableQueryEnrichment}
              theme={theme}
              onThemeChange={setTheme}
              savedLayouts={savedLayouts}
              onSaveLayout={handleSaveLayout}
              onLoadLayout={handleLoadLayout}
              onResetLayout={handleResetLayout}
              currentLayoutName={currentLayoutName}
            />
            <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />
            <ServiceStatusIndicator />
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="h-8 gap-2"
              >
                <UserCog className="w-4 h-4" />
                Admin
              </Button>
            )}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="h-8 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 bg-secondary/20 border border-secondary/40 rounded">
              <Activity className="w-3 h-3 text-secondary animate-pulse" />
              <span className="text-[10px] sm:text-xs text-secondary font-bold uppercase">{t('status')}</span>
            </div>
          </div>
        </div>
        {/* Navigation Menu */}
        <div className="flex items-center justify-center">
          <AppNavigationMenu language={language} />
        </div>
      </header>

      {/* Tabs: Search and Sector Watches */}
      <div className="px-2 sm:px-4 py-2 sm:py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{t('classicSearch')}</span>
              <span className="sm:hidden">{t('search')}</span>
            </TabsTrigger>
            <TabsTrigger value="watches" className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('sectorWatches')}</span>
              <span className="sm:hidden">{t('watches')}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="mt-0">
            <SearchBar 
              onSearch={handleSearch} 
              language={language} 
              currentQuery={currentQuery} 
              searchTrigger={searchTrigger}
              selectedApi={selectedApi}
              sourceType={sourceType}
              onSourceTypeChange={setSourceType}
              osintSources={osintSources}
              onOsintSourcesChange={setOsintSources}
              enableQueryEnrichment={enableQueryEnrichment}
            />
          </TabsContent>
          <TabsContent value="watches" className="mt-0">
            <div className="h-[400px] sm:h-[500px]">
              <SectorWatchesModule onLaunchWatch={handleLaunchWatch} language={language} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Grid - Full Screen Responsive Layout */}
      <main className="flex-1 px-2 sm:px-4 pb-2 sm:pb-3 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.moduleOrder}
            strategy={rectSortingStrategy}
          >
            {/* RESPONSIVE GRID - Fills screen, smart layout */}
            <div 
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 w-full"
              style={{
                gridAutoRows: '380px', // Same height for all
                gridAutoFlow: 'dense' // Fill gaps
              }}
            >
              {layout.moduleOrder.map((moduleId) => {
                const savedSize = moduleSizes[moduleId];
                const hasContent = articles.length > 0;
                
                if (!hasContent) return null;
                
                // Column spanning - Map large, others standard
                const getColSpan = (id: ModuleId) => {
                  switch (id) {
                    case 'map':
                      return 'lg:col-span-2'; // Map seul = 2 colonnes (important)
                    case 'network-graph':
                      return ''; // 1 colonne (moins pertinent)
                    case 'datafeed':
                      return ''; // 1 colonne
                    default:
                      return ''; // 1 colonne
                  }
                };
                
                return (
                  <div 
                    key={moduleId} 
                    className={`${getColSpan(moduleId)} h-full w-full`}
                  >
                    <ResizableDraggableModule
                      id={moduleId}
                      initialWidth={savedSize?.width || 460}
                      initialHeight={380}
                      onResize={(w, h) => handleModuleResize(moduleId, w, h)}
                    >
                      {getModuleComponent(moduleId)}
                    </ResizableDraggableModule>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};

export default Index;

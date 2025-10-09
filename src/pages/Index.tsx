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
import SettingsDialog from "@/components/SettingsDialog";
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";
import ResizableDraggableModule from "@/components/ResizableDraggableModule";
import LayoutManager from "@/components/LayoutManager";
import ReportGenerator from "@/components/ReportGenerator";
import { useLayoutConfig, ModuleId } from "@/hooks/useLayoutConfig";
import { useSavedLayouts } from "@/hooks/useSavedLayouts";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";
import { ApiSource } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<Language>("fr");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [selectedApi, setSelectedApi] = useState<ApiSource>('newsapi');
  const [sourceType, setSourceType] = useState<'news' | 'osint'>('news');
  const [osintSources, setOsintSources] = useState<string[]>(['mastodon', 'bluesky']);
  const [enableQueryEnrichment, setEnableQueryEnrichment] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("search");
  const [currentWatch, setCurrentWatch] = useState<any>(null);
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
    // Clear current watch if it's a manual search (not from a watch)
    if (!currentWatch || query !== currentQuery) {
      setCurrentWatch(null);
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
    setSelectedApi(watch.api);
    setCurrentWatch(watch); // Store the watch for language changes
    
    // Select the appropriate query based on the current language
    let queryToUse = watch.query; // Default to FR
    if (targetLanguage === 'en' && watch.query_en) {
      queryToUse = watch.query_en;
    } else if (targetLanguage === 'it' && watch.query_it) {
      queryToUse = watch.query_it;
    }
    
    setCurrentQuery(queryToUse);
    setActiveTab("search"); // Switch to search tab
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/50 border-b border-primary/30 px-2 sm:px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
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
            {articles.length > 0 && (
              <ReportGenerator
                articles={articles}
                analysis={analysis}
                query={currentQuery}
                language={language}
              />
            )}
            <div className="hidden lg:flex items-center gap-2">
              <LayoutManager
                savedLayouts={savedLayouts}
                onSave={handleSaveLayout}
                onLoad={handleLoadLayout}
                currentLayoutName={currentLayoutName}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('reset')}
              </Button>
            </div>
            <SettingsDialog 
              selectedApi={selectedApi} 
              onApiChange={setSelectedApi} 
              language={language}
              enableQueryEnrichment={enableQueryEnrichment}
              onEnableQueryEnrichmentChange={setEnableQueryEnrichment}
            />
            <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 bg-secondary/20 border border-secondary/40 rounded">
              <Activity className="w-3 h-3 text-secondary animate-pulse" />
              <span className="text-[10px] sm:text-xs text-secondary font-bold uppercase">{t('status')}</span>
            </div>
          </div>
        </div>
        {/* Mobile layout controls */}
        <div className="lg:hidden flex items-center gap-2 mt-2">
          <LayoutManager
            savedLayouts={savedLayouts}
            onSave={handleSaveLayout}
            onLoad={handleLoadLayout}
            currentLayoutName={currentLayoutName}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('reset')}
              </Button>
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

      {/* Main Grid - Resizable & Draggable Layout */}
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
            <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:gap-2">
              {layout.moduleOrder.map((moduleId) => {
                const savedSize = moduleSizes[moduleId];
                const hasContent = articles.length > 0;
                
                // Don't render empty modules
                if (!hasContent) return null;
                
                return (
                  <div 
                    key={moduleId} 
                    className="w-full lg:w-auto"
                  >
                    <ResizableDraggableModule
                      id={moduleId}
                      initialWidth={savedSize?.width || 460}
                      initialHeight={savedSize?.height || 345}
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

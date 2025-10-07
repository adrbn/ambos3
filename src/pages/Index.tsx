import { useState, useEffect, useRef } from "react";
import { Shield, Activity, RotateCcw } from "lucide-react";
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
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";
import ResizableDraggableModule from "@/components/ResizableDraggableModule";
import LayoutManager from "@/components/LayoutManager";
import { useLayoutConfig, ModuleId } from "@/hooks/useLayoutConfig";
import { useSavedLayouts } from "@/hooks/useSavedLayouts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<string>("en");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [selectedApi, setSelectedApi] = useState<'gnews' | 'newsapi'>('gnews');
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
    toast.success(`Layout "${name}" saved`);
  };

  const handleLoadLayout = (name: string) => {
    const savedLayout = getLayout(name);
    if (savedLayout) {
      updateLayout(savedLayout.moduleOrder);
      setModuleSizes(savedLayout.moduleSizes);
      toast.success(`Layout "${name}" loaded`);
    }
  };

  const handleSearch = (query: string, fetchedArticles: any[], analysisData: any) => {
    setCurrentQuery(query);
    setArticles(fetchedArticles);
    setAnalysis(analysisData);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (currentQuery) {
      toast.info(`Language changed to ${newLang.toUpperCase()}. Searching again...`);
      setSearchTrigger(prev => prev + 1);
    }
  };

  const handleLaunchWatch = (watch: any) => {
    const targetLanguage = language; // Use current language selection
    setSelectedApi(watch.api);
    
    // Select the appropriate query based on the current language
    let queryToUse = watch.query; // Default to FR
    if (targetLanguage === 'en' && watch.query_en) {
      queryToUse = watch.query_en;
    } else if (targetLanguage === 'it' && watch.query_it) {
      queryToUse = watch.query_it;
    }
    
    setCurrentQuery(queryToUse);
    toast.info(`Lancement de la veille: ${watch.name} (${targetLanguage.toUpperCase()})`);
    
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
        return <MapModule articles={articles} />;
      case 'timeline':
        return <TimelineModule articles={articles} />;
      case 'network-graph':
        return <NetworkGraph3D articles={articles} />;
      case 'entities':
        return <GraphModule entities={analysis?.entities || []} />;
      case 'summary':
        return <SummaryModule summary={analysis?.summary || ""} />;
      case 'predictions':
        return <PredictionsModule predictions={analysis?.predictions || []} sentiment={analysis?.sentiment || null} />;
      case 'datafeed':
        return <DataFeedModule articles={articles} />;
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
                AmbOS
              </h1>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">
                OSINT Command Center v2.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            <div className="hidden lg:flex items-center gap-2">
              <LayoutManager
                savedLayouts={savedLayouts}
                onSave={handleSaveLayout}
                onLoad={handleLoadLayout}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
            <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 bg-secondary/20 border border-secondary/40 rounded">
              <Activity className="w-3 h-3 text-secondary animate-pulse" />
              <span className="text-[10px] sm:text-xs text-secondary font-bold uppercase">Standby</span>
            </div>
          </div>
        </div>
        {/* Mobile layout controls */}
        <div className="lg:hidden flex items-center gap-2 mt-2">
          <LayoutManager
            savedLayouts={savedLayouts}
            onSave={handleSaveLayout}
            onLoad={handleLoadLayout}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </header>

      {/* Search Bar and Sector Watches */}
      <div className="px-2 sm:px-4 py-2 sm:py-3 flex flex-col lg:flex-row gap-3">
        <div className="flex-1">
          <SearchBar 
            onSearch={handleSearch} 
            language={language} 
            currentQuery={currentQuery} 
            searchTrigger={searchTrigger}
            selectedApi={selectedApi}
          />
        </div>
        <div className="lg:w-96">
          <div className="h-[200px] lg:h-[120px]">
            <SectorWatchesModule onLaunchWatch={handleLaunchWatch} />
          </div>
        </div>
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

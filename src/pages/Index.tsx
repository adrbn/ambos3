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
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";
import DraggableModule from "@/components/DraggableModule";
import { useLayoutConfig, ModuleId } from "@/hooks/useLayoutConfig";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<string>("en");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const { layout, updateLayout, resetLayout } = useLayoutConfig();

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
    toast.success('Layout réinitialisé');
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

  const getModuleComponent = (moduleId: ModuleId) => {
    switch (moduleId) {
      case 'map':
        return (
          <DraggableModule id="map" className="h-[500px]">
            <MapModule articles={articles} />
          </DraggableModule>
        );
      case 'timeline':
        return (
          <DraggableModule id="timeline" className="h-[240px]">
            <TimelineModule articles={articles} />
          </DraggableModule>
        );
      case 'network-graph':
        return (
          <DraggableModule id="network-graph" className="h-[360px]">
            <NetworkGraph3D articles={articles} />
          </DraggableModule>
        );
      case 'entities':
        return (
          <DraggableModule id="entities" className="h-[380px]">
            <GraphModule entities={analysis?.entities || []} />
          </DraggableModule>
        );
      case 'summary':
        return (
          <DraggableModule id="summary" className="h-[340px]">
            <SummaryModule summary={analysis?.summary || ""} />
          </DraggableModule>
        );
      case 'predictions':
        return (
          <DraggableModule id="predictions" className="h-[280px]">
            <PredictionsModule
              predictions={analysis?.predictions || []}
              sentiment={analysis?.sentiment || null}
            />
          </DraggableModule>
        );
      case 'datafeed':
        return (
          <DraggableModule id="datafeed" className="h-[220px]">
            <DataFeedModule articles={articles} />
          </DraggableModule>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/50 border-b border-primary/30 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-black text-primary text-glow tracking-wider uppercase">
                AmbOS
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                OSINT Command Center v2.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Layout
            </Button>
            <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 border border-secondary/40 rounded">
              <Activity className="w-3 h-3 text-secondary animate-pulse" />
              <span className="text-xs text-secondary font-bold uppercase">Standby</span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <SearchBar onSearch={handleSearch} language={language} currentQuery={currentQuery} searchTrigger={searchTrigger} />
      </div>

      {/* Main Grid - Draggable Layout */}
      <main className="flex-1 px-4 pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.moduleOrder}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {layout.moduleOrder.map((moduleId) => (
                <div
                  key={moduleId}
                  className={
                    moduleId === 'map' || moduleId === 'timeline'
                      ? 'lg:col-span-5'
                      : moduleId === 'network-graph' || moduleId === 'entities'
                      ? 'lg:col-span-4'
                      : 'lg:col-span-3'
                  }
                >
                  {getModuleComponent(moduleId)}
                </div>
              ))}
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

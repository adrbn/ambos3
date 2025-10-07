import { useState, useEffect } from "react";
import { Shield, Activity } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import MapModule from "@/components/MapModule";
import GraphModule from "@/components/GraphModule";
import PredictiveAnalysis from "@/components/PredictiveAnalysis";
import TimelineModule from "@/components/TimelineModule";
import DataFeedModule from "@/components/DataFeedModule";
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";
import { toast } from "sonner";

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<string>("en");
  const [searchTrigger, setSearchTrigger] = useState(0);

  const handleSearch = (query: string, fetchedArticles: any[], analysisData: any) => {
    setCurrentQuery(query);
    setArticles(fetchedArticles);
    setAnalysis(analysisData);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (currentQuery) {
      toast.info(`Language changed to ${newLang.toUpperCase()}. Searching again...`);
      // Trigger a new search with the same query but different language
      setSearchTrigger(prev => prev + 1);
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
                News Intelligence
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                OSINT Command Center v2.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Main Grid - More compact layout like reference */}
      <main className="flex-1 px-4 pb-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column - Map (takes more space) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="h-[500px]">
            <MapModule articles={articles} />
          </div>
          <div className="h-[240px]">
            <TimelineModule articles={articles} />
          </div>
        </div>

        {/* Middle Column - Graph & Analysis */}
        <div className="lg:col-span-4 space-y-3">
          <div className="h-[360px]">
            <GraphModule entities={analysis?.entities || []} />
          </div>
          <div className="h-[380px]">
            <PredictiveAnalysis
              predictions={analysis?.predictions || []}
              sentiment={analysis?.sentiment || null}
              summary={analysis?.summary || ""}
            />
          </div>
        </div>

        {/* Right Column - Data Feed */}
        <div className="lg:col-span-3">
          <div className="h-[750px]">
            <DataFeedModule articles={articles} />
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};

export default Index;

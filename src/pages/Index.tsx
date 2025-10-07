import { useState } from "react";
import { Satellite } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import MapModule from "@/components/MapModule";
import GraphModule from "@/components/GraphModule";
import PredictiveAnalysis from "@/components/PredictiveAnalysis";
import TimelineModule from "@/components/TimelineModule";
import DataFeedModule from "@/components/DataFeedModule";
import StatusBar from "@/components/StatusBar";
import LanguageSelector from "@/components/LanguageSelector";

const Index = () => {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [articles, setArticles] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [language, setLanguage] = useState<string>("en");

  const handleSearch = (query: string, fetchedArticles: any[], analysisData: any) => {
    setCurrentQuery(query);
    setArticles(fetchedArticles);
    setAnalysis(analysisData);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/30 border-b border-primary/30 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Satellite className="w-8 h-8 text-primary animate-pulse" />
            <div>
              <h1 className="text-2xl font-black text-primary text-glow tracking-wider">
                AmbOS
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Intelligence Center
              </p>
            </div>
          </div>
          <LanguageSelector language={language} onLanguageChange={setLanguage} />
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-6 py-6 flex justify-center">
        <SearchBar onSearch={handleSearch} language={language} />
      </div>

      {/* Main Grid */}
      <main className="flex-1 px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Map & Graph */}
        <div className="lg:col-span-1 space-y-4">
          <div className="h-[400px]">
            <MapModule articles={articles} />
          </div>
          <div className="h-[400px]">
            <GraphModule entities={analysis?.entities || []} />
          </div>
        </div>

        {/* Middle Column - Predictive Analysis & Timeline */}
        <div className="lg:col-span-1 space-y-4">
          <div className="h-[400px]">
            <PredictiveAnalysis
              predictions={analysis?.predictions || []}
              sentiment={analysis?.sentiment || null}
              summary={analysis?.summary || ""}
            />
          </div>
          <div className="h-[400px]">
            <TimelineModule articles={articles} />
          </div>
        </div>

        {/* Right Column - Data Feed */}
        <div className="lg:col-span-1">
          <div className="h-[816px]">
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

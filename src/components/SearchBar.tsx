import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SearchBarProps {
  onSearch: (query: string, articles: any[], analysis: any) => void;
  language: string;
}

const SearchBar = ({ onSearch, language }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    
    try {
      // Fetch news articles
      const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-news', {
        body: { query, language }
      });

      if (newsError) throw newsError;
      
      if (!newsData?.articles || newsData.articles.length === 0) {
        toast.error("No articles found for this query");
        setIsLoading(false);
        return;
      }

      toast.success(`Found ${newsData.articles.length} articles`);

      // Analyze articles with AI
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles: newsData.articles, query, language }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast.error("Failed to analyze articles");
        onSearch(query, newsData.articles, null);
      } else {
        toast.success("AI analysis complete");
        onSearch(query, newsData.articles, analysisData);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter intelligence query (e.g., 'Ukraine war', 'climate change')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={isLoading}
          className="w-full h-12 pl-12 pr-32 bg-card/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:border-glow font-mono"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70" />
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 hud-button h-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ANALYZING
            </>
          ) : (
            'SEARCH'
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;

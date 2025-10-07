import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SearchBarProps {
  onSearch: (query: string, articles: any[], analysis: any) => void;
  language: string;
  currentQuery: string;
  searchTrigger: number;
  selectedApi: 'gnews' | 'newsapi';
}

const SearchBar = ({ onSearch, language, currentQuery, searchTrigger, selectedApi }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    
    try {
      // Fetch news articles
      const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-news', {
        body: { query: queryToUse, language, api: selectedApi }
      });

      if (newsError) throw newsError;
      
      // Check for API errors in the response
      if (newsData?.error) {
        toast.error(newsData.error, { 
          duration: newsData.isRateLimitError ? 10000 : 6000 
        });
        console.error('API error:', newsData);
        setIsLoading(false);
        return;
      }
      
      if (!newsData?.articles || newsData.articles.length === 0) {
        const errorMsg = newsData?.totalArticles > 0 
          ? "Articles found but not available (30+ days old). Try recent news topics!" 
          : "No articles found. Try different keywords.";
        toast.error(errorMsg, { duration: 6000 });
        console.error('No articles returned:', newsData);
        setIsLoading(false);
        return;
      }

      toast.success(`Found ${newsData.articles.length} articles`);

      // Analyze articles with AI
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-news', {
        body: { articles: newsData.articles, query: queryToUse, language }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast.error("Failed to analyze articles");
        onSearch(queryToUse, newsData.articles, null);
      } else {
        toast.success("AI analysis complete");
        onSearch(queryToUse, newsData.articles, analysisData);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter intelligence query (e.g., 'Ukraine war', 'climate change')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={isLoading}
            className="w-full h-10 pl-10 pr-4 sm:pr-36 bg-card/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:border-glow font-mono text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
          <Button
            onClick={() => handleSearch()}
            disabled={isLoading}
            data-search-button
            className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 hud-button h-7 text-xs px-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                RECHERCHER
              </>
            ) : (
              'RECHERCHER'
            )}
          </Button>
        </div>
        <Button
          onClick={() => handleSearch()}
          disabled={isLoading}
          data-search-button
          className="sm:hidden hud-button h-10 text-xs px-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              RECHERCHER
            </>
          ) : (
            'RECHERCHER'
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;

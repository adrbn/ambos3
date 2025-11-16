import { useState, useEffect } from 'react';

export interface SearchHistoryItem {
  id: string;
  query: string;
  articles: any[];
  analysis: any;
  timestamp: number;
  language: string;
}

const MAX_HISTORY = 10;
const STORAGE_KEY = 'ambos_search_history';

/**
 * useSearchHistory - Persistent search history
 * Keeps track of recent searches to allow navigation back
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  const addToHistory = (query: string, articles: any[], analysis: any, language: string) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      articles,
      analysis,
      timestamp: Date.now(),
      language,
    };

    setHistory(prev => {
      const updated = [newItem, ...prev.slice(0, MAX_HISTORY - 1)];
      return updated;
    });
    setCurrentIndex(0);
  };

  const goBack = (): SearchHistoryItem | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  };

  const goForward = (): SearchHistoryItem | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
  };

  const canGoBack = currentIndex < history.length - 1;
  const canGoForward = currentIndex > 0;

  return {
    history,
    currentIndex,
    addToHistory,
    goBack,
    goForward,
    clearHistory,
    canGoBack,
    canGoForward,
    currentSearch: currentIndex >= 0 ? history[currentIndex] : null,
  };
}

export default useSearchHistory;


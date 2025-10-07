import { useState, useEffect } from 'react';
import { ModuleId } from './useLayoutConfig';

interface SavedLayout {
  name: string;
  moduleOrder: ModuleId[];
  moduleSizes: Record<string, { width: number; height: number }>;
  timestamp: number;
}

const STORAGE_KEY = 'ambos-saved-layouts';

export const useSavedLayouts = () => {
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayouts));
    } catch (error) {
      console.error('Failed to save layouts:', error);
    }
  }, [savedLayouts]);

  const saveLayout = (
    name: string,
    moduleOrder: ModuleId[],
    moduleSizes: Record<string, { width: number; height: number }>
  ) => {
    const newLayout: SavedLayout = {
      name,
      moduleOrder,
      moduleSizes,
      timestamp: Date.now(),
    };

    setSavedLayouts(prev => {
      const filtered = prev.filter(l => l.name !== name);
      return [...filtered, newLayout];
    });
  };

  const deleteLayout = (name: string) => {
    setSavedLayouts(prev => prev.filter(l => l.name !== name));
  };

  const getLayout = (name: string): SavedLayout | undefined => {
    return savedLayouts.find(l => l.name === name);
  };

  return {
    savedLayouts,
    saveLayout,
    deleteLayout,
    getLayout,
  };
};

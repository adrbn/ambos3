import { useState, useEffect } from 'react';

export type ModuleId = 
  | 'map'
  | 'timeline'
  | 'network-graph'
  | 'entities'
  | 'summary'
  | 'predictions'
  | 'datafeed';

interface LayoutConfig {
  moduleOrder: ModuleId[];
}

const DEFAULT_LAYOUT: LayoutConfig = {
  moduleOrder: [
    'predictions',
    'map',
    'timeline',
    'datafeed',
    'entities',
    'network-graph',
    'summary',
  ],
};

const STORAGE_KEY = 'ambos-layout-config';

export const useLayoutConfig = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, [layout]);

  const updateLayout = (newOrder: ModuleId[]) => {
    setLayout({ moduleOrder: newOrder });
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  return { layout, updateLayout, resetLayout };
};

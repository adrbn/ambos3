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

// AMB 2 Layout - Set as initial default
const AMB2_LAYOUT: LayoutConfig = {
  moduleOrder: [
    'summary',
    'map',
    'entities',
    'network-graph',
    'predictions',
    'timeline',
    'datafeed',
  ],
};

const STORAGE_KEY = 'ambos-layout-config';

export const useLayoutConfig = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : AMB2_LAYOUT; // Use AMB2 as default
    } catch {
      return AMB2_LAYOUT;
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

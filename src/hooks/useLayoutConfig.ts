import { useState, useEffect } from 'react';

export type ModuleId = 
  | 'map'
  | 'timeline'
  | 'network-graph'
  | 'entities'
  | 'summary'
  | 'predictions'
  | 'datafeed';

// Définition du type pour les tailles
export interface ModuleSizes {
  [moduleId: string]: { height: number; width: number };
}

interface LayoutConfig {
  moduleOrder: ModuleId[];
  moduleSizes: ModuleSizes; // Inclusion des tailles
}

// Configuration codée en dur pour "DEFAULT AMB 2" (Ordre et Tailles)
const AMB2_LAYOUT: LayoutConfig = {
  moduleOrder: [
    'summary',
    'map',
    'timeline', // Ordre corrigé
    'predictions',
    'entities',
    'network-graph',
    'datafeed',
  ],
  moduleSizes: {
    "datafeed": {"height": 345, "width": 486},
    "map": {"height": 345, "width": 916},
    "network-graph": {"height": 345, "width": 448},
    "predictions": {"height": 345, "width": 460},
    "timeline": {"height": 345, "width": 486}
    // Les autres modules prendront leur taille par défaut si non définis ici.
  }
};

const DEFAULT_LAYOUT: LayoutConfig = AMB2_LAYOUT; 

const STORAGE_KEY = 'ambos-layout-config';

export const useLayoutConfig = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      // ⚠️ ASSUREZ-VOUS D'AVOIR VIDÉ LE localStorage AVANT DE TESTER
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : AMB2_LAYOUT;
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

  /**
   * Met à jour le layout (ordre et tailles).
   * @param newOrder Le nouvel ordre des modules.
   * @param newSizes Les nouvelles tailles de modules (optionnel).
   */
  const updateLayout = (newOrder: ModuleId[], newSizes?: ModuleSizes) => {
    setLayout(prevLayout => ({ 
        moduleOrder: newOrder,
        moduleSizes: newSizes || prevLayout.moduleSizes
    }));
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  return { layout, updateLayout, resetLayout };
};

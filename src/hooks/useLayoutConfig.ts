import { useState, useEffect } from 'react';

export type ModuleId = 
  | 'map'
  | 'timeline'
  | 'network-graph'
  | 'entities'
  | 'summary'
  | 'predictions'
  | 'datafeed'
  | 'recommendations';

// Définition du type pour les tailles (basé sur vos données)
export interface ModuleSizes {
  [moduleId: string]: { height: number; width: number };
}

interface LayoutConfig {
  moduleOrder: ModuleId[];
  moduleSizes: ModuleSizes; // Ajout du support pour les tailles
}

// ⚠️ Configuration codée en dur pour "DEFAULT AMB 2"
// Inclut l'ordre et les tailles de blocs
const AMB2_LAYOUT: LayoutConfig = {
  moduleOrder: [
    'summary',
    'map',
    'timeline',
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
  }
};

// Le layout de réinitialisation est le même que le défaut initial
const DEFAULT_LAYOUT: LayoutConfig = AMB2_LAYOUT; 

const STORAGE_KEY = 'ambos-layout-config';

export const useLayoutConfig = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Utilise le layout stocké OU le défaut AMB2_LAYOUT si rien n'est trouvé
      return stored ? JSON.parse(stored) : AMB2_LAYOUT;
    } catch {
      // Retourne AMB2_LAYOUT en cas d'erreur (e.g. JSON mal formé)
      return AMB2_LAYOUT;
    }
  });

  useEffect(() => {
    try {
      // Le layout stocké dans localStorage inclut désormais l'ordre ET les tailles
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, [layout]);

  /**
   * Met à jour le layout.
   * Conserve les tailles existantes si newSizes n'est pas fourni.
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
    // Réinitialise à la configuration codée en dur "DEFAULT AMB 2"
    setLayout(DEFAULT_LAYOUT);
  };

  return { layout, updateLayout, resetLayout };
};

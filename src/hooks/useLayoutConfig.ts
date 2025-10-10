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

const DEFAULT_LAYOUT: LayoutConfig = AMB2_LAYOUT; 

const STORAGE_KEY = 'ambos-layout-config';

export const useLayoutConfig = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const storedLayout = JSON.parse(stored) as Partial<LayoutConfig>;
        
        // 🚀 CORRECTION MAJEURE: Logique de FUSION
        // Ceci garantit que toutes les tailles par défaut AMB2 sont présentes,
        // même si l'ancien layout stocké était d'un format qui ne les incluait pas.
        const layoutToUse: LayoutConfig = {
          // Utilise l'ordre stocké ou l'ordre par défaut AMB2
          moduleOrder: storedLayout.moduleOrder || AMB2_LAYOUT.moduleOrder, 
          
          // Fusionne les tailles: priorité aux tailles stockées si elles existent,
          // sinon utilise les tailles AMB2.
          moduleSizes: { 
            ...AMB2_LAYOUT.moduleSizes, 
            ...(storedLayout.moduleSizes || {})
          }
        };

        return layoutToUse;

      } else {
        // Si rien n'est stocké, on utilise le défaut complet (ordre et tailles).
        return AMB2_LAYOUT;
      }
    } catch {
      // Retourne AMB2_LAYOUT en cas d'erreur.
      return AMB2_LAYOUT;
    }
  });

  useEffect(() => {
    try {
      // Stocke toujours le layout au nouveau format (avec les tailles)
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

import { useState, useEffect } from 'react';
import { ModuleId } from './useLayoutConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedLayout {
  name: string;
  moduleOrder: ModuleId[];
  moduleSizes: Record<string, { width: number; height: number }>;
  timestamp: number;
}

export const useSavedLayouts = () => {
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch layouts from Supabase
  const fetchLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_layouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const layouts: SavedLayout[] = (data || []).map((row: any) => ({
        name: row.name,
        moduleOrder: row.module_order as ModuleId[],
        moduleSizes: row.module_sizes as Record<string, { width: number; height: number }>,
        timestamp: new Date(row.created_at).getTime(),
      }));

      setSavedLayouts(layouts);
    } catch (error) {
      console.error('Failed to fetch layouts:', error);
      toast.error('Failed to load saved layouts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayouts();
  }, []);

  const saveLayout = async (
    name: string,
    moduleOrder: ModuleId[],
    moduleSizes: Record<string, { width: number; height: number }>
  ) => {
    try {
      const { error } = await supabase
        .from('saved_layouts')
        .upsert({
          name,
          module_order: moduleOrder,
          module_sizes: moduleSizes,
        }, {
          onConflict: 'name'
        });

      if (error) throw error;

      toast.success('Layout saved to cloud!');
      await fetchLayouts();
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast.error('Failed to save layout');
    }
  };


  const getLayout = (name: string): SavedLayout | undefined => {
    return savedLayouts.find(l => l.name === name);
  };

  return {
    savedLayouts,
    saveLayout,
    getLayout,
    isLoading,
  };
};

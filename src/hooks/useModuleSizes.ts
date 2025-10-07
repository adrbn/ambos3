import { useState } from 'react';

export type ModuleSize = 'small' | 'medium' | 'large';

interface ModuleSizes {
  [key: string]: ModuleSize;
}

const SIZE_MAP: Record<ModuleSize, { height: string; cols: string }> = {
  small: { height: 'h-[180px]', cols: 'lg:col-span-3' },
  medium: { height: 'h-[280px]', cols: 'lg:col-span-4' },
  large: { height: 'h-[380px]', cols: 'lg:col-span-5' },
};

const STORAGE_KEY = 'ambos-module-sizes';

export const useModuleSizes = () => {
  const [sizes, setSizes] = useState<ModuleSizes>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateSize = (moduleId: string, size: ModuleSize) => {
    const newSizes = { ...sizes, [moduleId]: size };
    setSizes(newSizes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSizes));
    } catch (error) {
      console.error('Failed to save module sizes:', error);
    }
  };

  const getSize = (moduleId: string): ModuleSize => {
    return sizes[moduleId] || 'medium';
  };

  const getSizeClasses = (moduleId: string) => {
    const size = getSize(moduleId);
    return SIZE_MAP[size];
  };

  return { sizes, updateSize, getSize, getSizeClasses };
};

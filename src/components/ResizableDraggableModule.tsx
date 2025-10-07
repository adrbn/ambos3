import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { ModuleSize } from '@/hooks/useModuleSizes';

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  currentSize: ModuleSize;
  onResize: (size: ModuleSize) => void;
}

const ResizableDraggableModule = ({ 
  id, 
  children, 
  className,
  currentSize,
  onResize
}: ResizableDraggableModuleProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cycleSize = () => {
    const sizes: ModuleSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(currentSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onResize(sizes[nextIndex]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className || ''}`}
    >
      <div className="absolute top-1 left-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing bg-primary/10 hover:bg-primary/20 rounded p-0.5 backdrop-blur-sm border border-primary/30"
          title="Drag to reorder"
        >
          <GripVertical className="w-3 h-3 text-primary" />
        </div>
        <button
          onClick={cycleSize}
          className="bg-primary/10 hover:bg-primary/20 rounded p-0.5 backdrop-blur-sm border border-primary/30"
          title={`Resize (current: ${currentSize})`}
        >
          {currentSize === 'small' ? (
            <Maximize2 className="w-3 h-3 text-primary" />
          ) : (
            <Minimize2 className="w-3 h-3 text-primary" />
          )}
        </button>
      </div>
      {children}
    </div>
  );
};

export default ResizableDraggableModule;

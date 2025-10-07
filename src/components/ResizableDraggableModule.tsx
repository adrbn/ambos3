import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
}

const ResizableDraggableModule = ({ 
  id, 
  children
}: ResizableDraggableModuleProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sur mobile, pas de redimensionnement ni drag-and-drop
  if (isMobile) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full h-full"
      >
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    );
  }

  // Sur desktop, with drag handle and full stretch
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-full h-full"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 rounded p-0.5 backdrop-blur-sm border border-primary/30"
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3 text-primary" />
      </div>
      
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ResizableDraggableModule;

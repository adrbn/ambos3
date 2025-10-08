import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useState, useEffect } from 'react';

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  onResize?: (width: number, height: number) => void;
}

const ResizableDraggableModule = ({ 
  id, 
  children,
  initialWidth = 400,
  initialHeight = 300,
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

  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMobile, setIsMobile] = useState(false);

  // Update size when initialHeight/initialWidth change (e.g., when content loads)
  useEffect(() => {
    setSize({ width: initialWidth, height: initialHeight });
  }, [initialWidth, initialHeight]);

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

  const handleResize = (event: any, { size: newSize }: any) => {
    setSize(newSize);
    onResize?.(newSize.width, newSize.height);
  };

  // Sur mobile, pas de redimensionnement ni drag-and-drop
  if (isMobile) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full"
      >
        <div className="w-full h-full" style={{ height: `${initialHeight}px` }}>
          {children}
        </div>
      </div>
    );
  }

  // Sur desktop, avec redimensionnement
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 rounded p-0.5 backdrop-blur-sm border border-primary/30"
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3 text-primary" />
      </div>
      
      <ResizableBox
        width={size.width}
        height={size.height}
        onResize={handleResize}
        minConstraints={[200, 150]}
        maxConstraints={[1200, 800]}
        resizeHandles={['se', 's', 'e', 'sw', 'w', 'n', 'ne', 'nw']}
        className="w-full h-full"
        handle={(handleAxis) => {
          const handleStyles: Record<string, { cursor: string; position: string; component: JSX.Element }> = {
            se: { cursor: 'cursor-se-resize', position: 'bottom-0 right-0', component: <div className="w-3 h-3 border-r-2 border-b-2 border-primary/60" /> },
            s: { cursor: 'cursor-s-resize', position: 'bottom-0 left-1/2 -translate-x-1/2', component: <div className="w-8 h-1.5 border-b-2 border-primary/60 rounded-full" /> },
            e: { cursor: 'cursor-e-resize', position: 'right-0 top-1/2 -translate-y-1/2', component: <div className="h-8 w-1.5 border-r-2 border-primary/60 rounded-full" /> },
            sw: { cursor: 'cursor-sw-resize', position: 'bottom-0 left-0', component: <div className="w-3 h-3 border-l-2 border-b-2 border-primary/60" /> },
            w: { cursor: 'cursor-w-resize', position: 'left-0 top-1/2 -translate-y-1/2', component: <div className="h-8 w-1.5 border-l-2 border-primary/60 rounded-full" /> },
            n: { cursor: 'cursor-n-resize', position: 'top-0 left-1/2 -translate-x-1/2', component: <div className="w-8 h-1.5 border-t-2 border-primary/60 rounded-full" /> },
            ne: { cursor: 'cursor-ne-resize', position: 'top-0 right-0', component: <div className="w-3 h-3 border-r-2 border-t-2 border-primary/60" /> },
            nw: { cursor: 'cursor-nw-resize', position: 'top-0 left-0', component: <div className="w-3 h-3 border-l-2 border-t-2 border-primary/60" /> },
          };
          
          const style = handleStyles[handleAxis];
          return (
            <div className={`absolute ${style.position} p-1 ${style.cursor} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
              {style.component}
            </div>
          );
        }}
      >
        <div className="w-full h-full overflow-hidden">
          {children}
        </div>
      </ResizableBox>
    </div>
  );
};

export default ResizableDraggableModule;

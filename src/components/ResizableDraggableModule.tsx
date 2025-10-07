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
        className="relative"
      >
        <div className="w-full h-[400px]">
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
        resizeHandles={['se', 's', 'e']}
        className="w-full h-full"
        handle={
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-primary/50" />
          </div>
        }
      >
        <div className="w-full h-full overflow-hidden">
          {children}
        </div>
      </ResizableBox>
    </div>
  );
};

export default ResizableDraggableModule;

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useState, useEffect } from 'react';

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
  // ✅ Props contrôlées
  width: number;
  height: number;
  onResize?: (width: number, height: number) => void;
}

const ResizableDraggableModule = ({ 
  id, 
  children,
  width, 
  height, 
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

  // L'état interne pour stocker la taille PENDANT le redimensionnement actif
  const [internalSize, setInternalSize] = useState({ width, height });
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Synchronise l'état interne avec les props (re-rendu du layout ou chargement)
  useEffect(() => {
    setInternalSize({ width, height });
  }, [width, height]);


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
    // Met à jour l'état interne PENDANT le redimensionnement pour un feedback fluide
    setInternalSize(newSize); 
    // ✅ Notifie le parent qui met à jour la source de vérité globale (le hook)
    onResize?.(newSize.width, newSize.height); 
  };

  // Sur mobile, le redimensionnement est désactivé
  if (isMobile) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full"
      >
        <div className="w-full h-full" style={{ height: `${height}px` }}>
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
        title="Glisser pour réordonner"
      >
        <GripVertical className="w-3 h-3 text-primary" />
      </div>
      
      <ResizableBox
        width={internalSize.width} // ⬅️ Utilise l'état interne pour un redimensionnement fluide
        height={internalSize.height} // ⬅️ Utilise l'état interne pour un redimensionnement fluide
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

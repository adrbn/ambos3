import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useState, useEffect } from 'react'; // useState est toujours nécessaire pour isMobile

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
  // Les props sont désormais la source unique de vérité pour la taille
  width: number; 
  height: number; 
  onResize?: (width: number, height: number) => void;
}

const ResizableDraggableModule = ({ 
  id, 
  children,
  width, // Taille actuelle/initiale
  height, // Taille actuelle/initiale
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

  // Nous conservons un état interne uniquement pour isMobile.
  // La taille n'est plus gérée par useState pour éviter le conflit.
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
    // ⚠️ La hauteur et la largeur sont implicitement contrôlées par ResizableBox 
    // ou par le conteneur parent via DND-kit, mais nous gérons la taille ici.
    // Laissez-le simple pour l'instant.
  };
  
  // La fonction de redimensionnement appelle simplement le callback pour que 
  // le parent (qui utilise useLayoutConfig) puisse mettre à jour la source de vérité.
  const handleResize = (event: any, { size: newSize }: any) => {
    // Il n'y a plus de setSize(), car la source de vérité est la prop.
    // Le parent doit appeler updateLayout avec les nouvelles tailles.
    onResize?.(newSize.width, newSize.height);
  };

  // Sur mobile
  if (isMobile) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full"
      >
        {/* Utilise la prop 'height' directement */}
        <div className="w-full h-full" style={{ height: `${height}px` }}> 
          {children}
        </div>
      </div>
    );
  }

  // Sur desktop (ResizableBox)
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
        width={width} // ⬅️ Utilise la PROP directement
        height={height} // ⬅️ Utilise la PROP directement
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

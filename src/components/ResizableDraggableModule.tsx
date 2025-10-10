import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useState, useEffect } from 'react';

interface ResizableDraggableModuleProps {
  id: string;
  children: React.ReactNode;
  // ⚠️ Renommés pour plus de clarté. Ils sont les tailles COURANTES/INITIALES
  width: number;
  height: number;
  onResize?: (width: number, height: number) => void;
}

const ResizableDraggableModule = ({ 
  id, 
  children,
  width, // Nouvelle prop: taille actuelle/initiale
  height, // Nouvelle prop: taille actuelle/initiale
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

  // ⚠️ CORRECTION 1: L'état est maintenant utilisé UNIQUEMENT pour stocker la taille 
  // activement ajustée par l'utilisateur lors du redimensionnement.
  // Il est initialisé avec les props.
  const [internalSize, setInternalSize] = useState({ width, height });
  const [isMobile, setIsMobile] = useState(false);

  // ⚠️ CORRECTION 2: Retire l'effet qui réinitialisait l'état après le premier chargement.
  // On utilise plutôt les props directement.

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ⚠️ CORRECTION 3: Met à jour l'état interne pour qu'il corresponde aux props
  // UNIQUEMENT lorsque le composant passe de non-contrôlé à contrôlé (initialisation).
  // La ResizableBox utilisera les props directement, mais si une interaction (drag) commence,
  // l'état interne prend le relais. C'est une stratégie de "contrôle hybride".
  useEffect(() => {
      setInternalSize({ width, height });
  }, [width, height]);


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleResize = (event: any, { size: newSize }: any) => {
    setInternalSize(newSize); // Mise à jour de l'état pendant le redimensionnement
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
        {/* Utilise la prop 'height' directement pour la taille initiale */}
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
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3 text-primary" />
      </div>
      
      <ResizableBox
        // ⚠️ CORRECTION 4: ResizableBox utilise les props (width/height)
        // qui viennent du layout. L'état interne est géré par la librairie
        // ResizableBox lors de l'interaction, via handleResize.
        // On passe internalSize pour utiliser la taille stockée si disponible.
        width={internalSize.width} 
        height={internalSize.height}
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

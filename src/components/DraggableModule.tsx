import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableModuleProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableModule = ({ id, children, className }: DraggableModuleProps) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className || ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 hover:bg-primary/30 rounded p-1 backdrop-blur-sm"
      >
        <GripVertical className="w-4 h-4 text-primary" />
      </div>
      {children}
    </div>
  );
};

export default DraggableModule;

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

interface WeAiBlockProps {
  id: string;
  title: React.ReactNode;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  children: React.ReactNode;
}

const WeAiBlock: React.FC<WeAiBlockProps> = ({ id, title, isCollapsed, onToggleCollapse, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-bmcdark-800 rounded-2xl shadow-lg border border-white/5 relative overflow-hidden mb-6 transition-colors ${isDragging ? 'border-bmcaccent/50 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : ''}`}
    >
      {/* Block Header */}
      <div className="flex justify-between items-center p-4 border-b border-white/10 bg-bmcdark-900/50 group">
         <div className="flex items-center gap-4">
             {/* Drag Handle */}
             <div 
               {...attributes} 
               {...listeners} 
               className="cursor-pointer text-slate-500 hover:text-bmcaccent p-1.5 rounded transition-colors touch-none"
               title="Drag to reorder block"
             >
               <GripHorizontal size={20} />
             </div>
             
             {/* Title */}
             <div className="text-xl font-bold text-slate-200 select-none flex items-center gap-2">
                {title}
             </div>
         </div>
         
         {/* Collapse Toggle */}
         <button 
           onClick={() => onToggleCollapse(id)} 
           className="text-slate-500 hover:text-white p-2 text-sm font-bold flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 transition-colors focus:outline-none"
           title={isCollapsed ? "Expand block" : "Collapse block"}
         >
             {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
         </button>
      </div>
      
      {/* Block Content */}
      {!isCollapsed && (
         <div className="p-6">
           {children}
         </div>
      )}
    </div>
  );
};

export default WeAiBlock;

import React from 'react';
import { CheckCircle } from 'lucide-react';

interface PostIconProps {
  id: string;
  name: string;
  x: number; // Coordenada em pixels
  y: number; // Coordenada em pixels
  isSelected?: boolean;
  isCompleted?: boolean;
  postType?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onLeftClick?: () => void; // Nova prop para clique esquerdo (editar)
  onDragStart?: (e: React.MouseEvent) => void;
  onDrag?: (e: React.MouseEvent) => void;
  onDragEnd?: (e: React.MouseEvent) => void;
  isDragging?: boolean; // Nova prop para indicar se está sendo arrastado
}

// Componente de ícone personalizado para poste elétrico
function ElectricPoleIcon({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Poste principal (vertical) */}
      <rect x="11" y="3" width="2" height="18" fill={color} />
      
      {/* Cruzeta superior */}
      <rect x="6" y="6" width="12" height="1.5" fill={color} />
      
      {/* Cruzeta do meio */}
      <rect x="7" y="10" width="10" height="1.5" fill={color} />
      
      {/* Base do poste */}
      <rect x="9" y="20" width="6" height="1" fill={color} />
      
      {/* Isoladores (pontos pequenos nas cruzetas) */}
      <circle cx="7" cy="6.75" r="0.8" fill={color} />
      <circle cx="12" cy="6.75" r="0.8" fill={color} />
      <circle cx="17" cy="6.75" r="0.8" fill={color} />
      
      <circle cx="8" cy="10.75" r="0.6" fill={color} />
      <circle cx="12" cy="10.75" r="0.6" fill={color} />
      <circle cx="16" cy="10.75" r="0.6" fill={color} />
      
      {/* Cabos (linhas curvas) */}
      <path d="M7 7.5 Q9.5 9 12 7.5 Q14.5 9 17 7.5" stroke={color} strokeWidth="0.5" fill="none" />
      <path d="M8 11.5 Q10 13 12 11.5 Q14 13 16 11.5" stroke={color} strokeWidth="0.5" fill="none" />
    </svg>
  );
}

export function PostIcon({
  name,
  x,
  y,
  isSelected = false,
  isCompleted = false,
  postType,
  onClick,
  onDoubleClick,
  onLeftClick,
  onDragStart,
  onDrag,
  onDragEnd,
  isDragging: isDraggingProp = false
}: PostIconProps) {
  const [isLocalDragging, setIsLocalDragging] = React.useState(false);
  const [dragStartPos, setDragStartPos] = React.useState({ x: 0, y: 0 });
  
  // Tamanho fixo do ícone
  const ICON_SIZE = 32;
  
  // Handler para clique
  const handleClick = (e: React.MouseEvent) => {
    // Não executar o clique se estava arrastando
    if (isLocalDragging) {
      setIsLocalDragging(false);
      return;
    }
    
    // Se tiver onLeftClick definido, usar ele para clique esquerdo normal
    if (onLeftClick) {
      onLeftClick();
    } else if (onClick) {
      // Fallback para onClick antigo (compatibilidade)
      onClick();
    }
  };

  // Handler para mousedown - inicia o drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setIsLocalDragging(false);
    
    if (onDragStart) {
      onDragStart(e);
    }
  };

  // Handler para mouse move - detecta se está arrastando
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // Botão esquerdo pressionado
      const deltaX = Math.abs(e.clientX - dragStartPos.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.y);
      
      // Se moveu mais de 3 pixels, considera como drag
      if (deltaX > 3 || deltaY > 3) {
        setIsLocalDragging(true);
      }
    }
  };
  
  // Determinar se está sendo arrastado (local ou prop)
  const isBeingDragged = isDraggingProp || isLocalDragging;
  
  return (
    <div
      className={`absolute cursor-move z-50 ${
        isSelected ? 'scale-125' : 'hover:scale-110'
      } ${!isBeingDragged ? 'transition-all duration-200' : ''}`}
      style={{
        left: `${x - (ICON_SIZE / 2)}px`,
        top: `${y - (ICON_SIZE / 2)}px`,
        width: `${ICON_SIZE}px`,
        height: `${ICON_SIZE}px`,
      }}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      {/* Ícone principal do poste */}
      <div className={`relative w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
        isSelected 
          ? 'bg-blue-600 shadow-lg' 
          : 'bg-blue-500 shadow-md hover:bg-blue-600'
      }`}>
        <ElectricPoleIcon className="h-5 w-5" color="white" />
        {isCompleted && (
          <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
        )}
      </div>
      
      {/* Label do poste */}
      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
        isSelected 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-800 text-white'
      }`}>
        {name}
        {postType && ` - ${postType}`}
      </div>
    </div>
  );
}

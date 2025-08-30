import React from 'react';
import { MapPin, CheckCircle } from 'lucide-react';

interface PostIconProps {
  id: string;
  name: string;
  x: number; // Coordenada percentual (0-100)
  y: number; // Coordenada percentual (0-100)
  scale: number;
  isSelected?: boolean;
  isCompleted?: boolean;
  postType?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export function PostIcon({
  id,
  name,
  x,
  y,
  scale,
  isSelected = false,
  isCompleted = false,
  postType,
  onClick,
  onDoubleClick
}: PostIconProps) {
  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 z-30 ${
        isSelected ? 'scale-125' : 'hover:scale-110'
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
        transformOrigin: 'center',
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Ícone principal do poste */}
      <div className={`relative p-2 rounded-full transition-colors ${
        isSelected 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-red-500 text-white shadow-md hover:bg-red-600'
      }`}>
        <MapPin className="h-6 w-6" />
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

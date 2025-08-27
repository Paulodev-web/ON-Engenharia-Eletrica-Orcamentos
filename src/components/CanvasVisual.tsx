import React, { useState, useRef, useEffect } from 'react';
import { Upload, MapPin, CheckCircle, Trash2 } from 'lucide-react';
import { Orcamento, Poste, TipoPoste } from '../types';

interface CanvasVisualProps {
  orcamento: Orcamento;
  selectedPoste: Poste | null;
  onPosteClick: (poste: Poste) => void;
  onAddPoste: (x: number, y: number, tipo: TipoPoste) => void;
  onUpdatePoste: (posteId: string, updates: Partial<Poste>) => void;
  onUploadImage: () => void;
  onDeleteImage: () => void;
  onDeletePoste: (posteId: string) => void;
}

export function CanvasVisual({ 
  orcamento, 
  selectedPoste, 
  onPosteClick, 
  onAddPoste, 
  onUpdatePoste,
  onUploadImage,
  onDeleteImage,
  onDeletePoste
}: CanvasVisualProps) {
  const [selectedTipoPoste, setSelectedTipoPoste] = useState<TipoPoste>('600mm');
  const [showPosteMenu, setShowPosteMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  // Calcular dimensões da imagem quando ela mudar
  useEffect(() => {
    if (orcamento.imagemPlanta) {
      const img = new Image();
      img.src = orcamento.imagemPlanta;
      img.onload = () => {
        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageAspectRatio = img.width / img.height;
        const containerAspectRatio = containerWidth / containerHeight;

        let width: number;
        let height: number;

        if (imageAspectRatio > containerAspectRatio) {
          // Imagem mais larga que o container
          width = containerWidth;
          height = containerWidth / imageAspectRatio;
        } else {
          // Imagem mais alta que o container
          height = containerHeight;
          width = containerHeight * imageAspectRatio;
        }

        setImageDimensions({
          width,
          height,
          naturalWidth: img.width,
          naturalHeight: img.height
        });
      };
    } else {
      setImageDimensions(null);
    }
  }, [orcamento.imagemPlanta]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!orcamento.imagemPlanta || !imageDimensions || !containerRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calcular coordenadas relativas à imagem
    const imageRect = event.currentTarget.firstElementChild?.getBoundingClientRect();
    if (!imageRect) return;

    // Verificar se o clique está dentro da área da imagem
    if (
      clickX >= imageRect.left - rect.left &&
      clickX <= imageRect.left - rect.left + imageDimensions.width &&
      clickY >= imageRect.top - rect.top &&
      clickY <= imageRect.top - rect.top + imageDimensions.height
    ) {
      const x = ((clickX - (imageRect.left - rect.left)) / imageDimensions.width) * 100;
      const y = ((clickY - (imageRect.top - rect.top)) / imageDimensions.height) * 100;
      
      onAddPoste(x, y, selectedTipoPoste);
    }
  };

  const handlePosteDrag = (poste: Poste, event: React.DragEvent) => {
    event.dataTransfer.setData('text/plain', poste.id);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!imageDimensions || !containerRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    // Calcular coordenadas relativas à imagem
    const imageRect = event.currentTarget.firstElementChild?.getBoundingClientRect();
    if (!imageRect) return;

    // Verificar se o drop está dentro da área da imagem
    if (
      dropX >= imageRect.left - rect.left &&
      dropX <= imageRect.left - rect.left + imageDimensions.width &&
      dropY >= imageRect.top - rect.top &&
      dropY <= imageRect.top - rect.top + imageDimensions.height
    ) {
      const posteId = event.dataTransfer.getData('text/plain');
      const x = ((dropX - (imageRect.left - rect.left)) / imageDimensions.width) * 100;
      const y = ((dropY - (imageRect.top - rect.top)) / imageDimensions.height) * 100;
      
      onUpdatePoste(posteId, { x, y });
    }
  };

  if (!orcamento.imagemPlanta) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Faça o upload da planta do seu projeto
          </h3>
          <button
            onClick={onUploadImage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fazer Upload de Imagem
          </button>
        </div>
      </div>
    );
  }

  const tiposPoste: TipoPoste[] = ['600mm', '1000mm', '1500mm', '2000mm'];

  return (
    <div className="h-full flex flex-col">
      {/* Controles superiores */}
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTipoPoste}
            onChange={(e) => setSelectedTipoPoste(e.target.value as TipoPoste)}
            className="px-3 py-2 border rounded-lg"
          >
            {tiposPoste.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            Clique na imagem para adicionar um poste
          </span>
        </div>
        <button
          onClick={onDeleteImage}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
        >
          <Trash2 className="h-5 w-5" />
          <span>Excluir Imagem</span>
        </button>
      </div>

      {/* Container principal com imagem e tabela */}
      <div className="flex-1 flex flex-col">
        {/* Área da imagem com postes */}
        <div 
          ref={containerRef}
          className="flex-1 relative cursor-crosshair flex items-center justify-center bg-gray-50"
          onClick={handleCanvasClick}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div
            className="relative"
            style={{
              width: imageDimensions?.width ?? '100%',
              height: imageDimensions?.height ?? '100%',
              backgroundImage: `url(${orcamento.imagemPlanta})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Postes */}
            {orcamento.postes.map((poste) => (
              <div
                key={poste.id}
                draggable
                onDragStart={(e) => handlePosteDrag(poste, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showPosteMenu === poste.id) {
                    setShowPosteMenu(null);
                  } else {
                    setShowPosteMenu(poste.id);
                    onPosteClick(poste);
                  }
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                  selectedPoste?.id === poste.id 
                    ? 'scale-125 z-10' 
                    : 'hover:scale-110'
                }`}
                style={{
                  left: `${poste.x}%`,
                  top: `${poste.y}%`,
                }}
              >
                <div className={`relative p-2 rounded-full ${
                  selectedPoste?.id === poste.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-red-500 text-white shadow-md'
                }`}>
                  <MapPin className="h-6 w-6" />
                  {poste.concluido && (
                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
                  )}
                </div>
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  selectedPoste?.id === poste.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-white'
                }`}>
                  {poste.nome} - {poste.tipo}
                </div>

                {/* Menu do poste */}
                {showPosteMenu === poste.id && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 bg-white rounded-lg shadow-lg border p-2 z-20">
                    <select
                      value={poste.tipo}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdatePoste(poste.id, { tipo: e.target.value as TipoPoste });
                      }}
                      className="mb-2 px-2 py-1 border rounded w-full"
                    >
                      {tiposPoste.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePoste(poste.id);
                        setShowPosteMenu(null);
                      }}
                      className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir Poste</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
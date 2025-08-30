import React, { useState, useRef, useEffect } from 'react';
import { Upload, MapPin, CheckCircle, Trash2, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Orcamento, Poste, TipoPoste, BudgetPostDetail } from '../types';
import { PostIcon } from './PostIcon';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface CanvasVisualProps {
  orcamento: Orcamento;
  budgetDetails?: BudgetPostDetail[] | null;
  selectedPoste: Poste | null;
  selectedPostDetail?: BudgetPostDetail | null;
  onPosteClick: (poste: Poste) => void;
  onPostDetailClick?: (post: BudgetPostDetail) => void;
  onAddPoste: (x: number, y: number, tipo: TipoPoste) => void;
  onUpdatePoste: (posteId: string, updates: Partial<Poste>) => void;
  onUploadImage: () => void;
  onDeleteImage: () => void;
  onDeletePoste: (posteId: string) => void;
  onRightClick?: (x: number, y: number) => void;
  loadingUpload?: boolean;
}

export function CanvasVisual({ 
  orcamento, 
  budgetDetails,
  selectedPoste, 
  selectedPostDetail,
  onPosteClick, 
  onPostDetailClick,
  onAddPoste, 
  onUpdatePoste,
  onUploadImage,
  onDeleteImage,
  onDeletePoste,
  onRightClick,
  loadingUpload = false
}: CanvasVisualProps) {
  const [selectedTipoPoste, setSelectedTipoPoste] = useState<TipoPoste>('600mm');
  const [showPosteMenu, setShowPosteMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);
  
  // Estados para PDF
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Detectar se é PDF
  const isPDF = orcamento.imagemPlanta?.toLowerCase().includes('.pdf') || 
                orcamento.imagemPlanta?.toLowerCase().includes('application/pdf');

  // Calcular dimensões da imagem quando ela mudar
  useEffect(() => {
    if (orcamento.imagemPlanta && !isPDF) {
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
    } else if (isPDF) {
      // Para PDFs, definir loading state e resetar paginação
      setPdfLoading(true);
      setNumPages(null);
      setPageNumber(1);
      setImageDimensions(null);
    } else {
      setImageDimensions(null);
    }
  }, [orcamento.imagemPlanta, isPDF]);

  // Funções para PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoading(false);
    console.log('PDF carregado com sucesso:', numPages, 'páginas');
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Erro ao carregar PDF:', error);
    setPdfLoading(false);
  };

  const onPageLoadSuccess = (page: any) => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = container.clientWidth - 40; // Margem
    const containerHeight = container.clientHeight - 100; // Espaço para controles
    
    // Calcular escala para preencher o container mantendo aspect ratio
    const scaleX = containerWidth / viewport.width;
    const scaleY = containerHeight / viewport.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Para garantir alta qualidade, usar uma escala mínima de 1.5
    // Mas limitar o máximo para evitar canvas gigante
    const finalScale = Math.max(scale, 1.5);
    const maxScale = Math.min(containerWidth / viewport.width, containerHeight / viewport.height, 3);
    const clampedScale = Math.min(finalScale, maxScale);
    
    // Calcular dimensões finais com alta qualidade mas responsivas
    const finalWidth = Math.min(viewport.width * clampedScale, containerWidth);
    const finalHeight = Math.min(viewport.height * clampedScale, containerHeight);

    setImageDimensions({
      width: finalWidth,
      height: finalHeight,
      naturalWidth: viewport.width,
      naturalHeight: viewport.height
    });
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber >= 1 && numPages && newPageNumber <= numPages) {
        // Resetar dimensões para forçar recálculo da nova página
        setImageDimensions(null);
        return newPageNumber;
      }
      return prevPageNumber;
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Remover a funcionalidade de adicionar poste com clique esquerdo
    // Agora será usado apenas o clique direito
  };

  const handleCanvasRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault(); // Impedir menu padrão do navegador
    
    if (!orcamento.imagemPlanta || !onRightClick) return;

    // Coordenadas do clique relativas ao elemento
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Converter para coordenadas percentuais (0-100) baseadas no tamanho do container
    const x = (clickX / rect.width) * 100;
    const y = (clickY / rect.height) * 100;
    
    // Garantir que as coordenadas estejam dentro dos limites
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      console.log(`Clique direito detectado: x=${x.toFixed(2)}%, y=${y.toFixed(2)}%`);
      onRightClick(x, y);
    }
  };

  const handlePosteDrag = (poste: Poste, event: React.DragEvent) => {
    event.dataTransfer.setData('text/plain', poste.id);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!imageDimensions) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    // Calcular coordenadas percentuais para o sistema transformado
    const x = (dropX / rect.width) * 100;
    const y = (dropY / rect.height) * 100;
    
    // Garantir que as coordenadas estejam dentro dos limites
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      const posteId = event.dataTransfer.getData('text/plain');
      onUpdatePoste(posteId, { x, y });
    }
  };

  if (!orcamento.imagemPlanta) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          {loadingUpload ? (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Fazendo upload da planta...
              </h3>
              <p className="text-sm text-gray-500">
                Por favor, aguarde enquanto processamos o arquivo.
              </p>
            </>
          ) : (
            <>
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Faça o upload da planta do seu projeto
              </h3>
              <button
                onClick={onUploadImage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fazer Upload de Imagem/PDF
              </button>
            </>
          )}
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
            disabled={loadingUpload}
          >
            {tiposPoste.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
          
          {/* Controles de PDF */}
          {isPDF && numPages && numPages > 1 && (
            <div className="flex items-center space-x-2 border rounded-lg px-2 py-1">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1 || loadingUpload}
                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages || loadingUpload}
                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Controles de Zoom */}
          <div className="flex items-center space-x-1 border rounded-lg px-2 py-1">
            <button
              onClick={() => transformRef.current?.zoomOut()}
              disabled={loadingUpload}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => transformRef.current?.resetTransform()}
              disabled={loadingUpload}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resetar zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => transformRef.current?.zoomIn()}
              disabled={loadingUpload}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          
          <span className="text-sm text-gray-600">
            {loadingUpload ? 'Processando upload...' : 
             pdfLoading ? 'Carregando PDF...' :
             `Clique com o botão direito na ${isPDF ? 'página' : 'imagem'} para adicionar um poste`}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onUploadImage}
            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loadingUpload}
          >
            {loadingUpload ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Nova Imagem/PDF</span>
              </>
            )}
          </button>
          <button
            onClick={onDeleteImage}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loadingUpload}
          >
            <Trash2 className="h-5 w-5" />
            <span>Excluir Planta</span>
          </button>
        </div>
      </div>

      {/* Container principal com imagem e tabela */}
      <div className="flex-1 flex flex-col">
        {/* Área da imagem com postes */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-gray-50"
        >
          <TransformWrapper
            ref={transformRef}
            minScale={0.5}
            maxScale={5}
            initialScale={1}
            wheel={{ step: 0.1 }}
            panning={{ disabled: false }}
            doubleClick={{ disabled: false }}
            centerOnInit={true}
            limitToBounds={false}
          >
            {({ scale, positionX, positionY }) => (
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full flex items-center justify-center"
              >
                <div 
                  className="relative cursor-crosshair"
                  onClick={handleCanvasClick}
                  onContextMenu={handleCanvasRightClick}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isPDF ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {pdfLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Carregando PDF...</span>
                          </div>
                        </div>
                      )}
                      <Document
                        file={orcamento.imagemPlanta}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={<div />} // Loading personalizado acima
                        error={
                          <div className="text-center text-red-600 p-4">
                            <p>Erro ao carregar PDF</p>
                            <p className="text-sm">Verifique se o arquivo é válido</p>
                          </div>
                        }
                        className="w-full h-full flex items-center justify-center"
                      >
                        {/* 
                          Configuração de alta qualidade para PDF:
                          - renderMode="canvas": Renderização em canvas para interatividade
                          - scale={1.5}: Escala adicional para garantir alta resolução
                          - width/height: Dimensões calculadas dinamicamente para preencher o container
                          - renderTextLayer={false}: Desabilita camada de texto para melhor performance
                          - renderAnnotationLayer={false}: Desabilita anotações para melhor performance
                          - className="w-full h-auto": Responsividade Tailwind CSS para o canvas
                        */}
                        <Page
                          pageNumber={pageNumber}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={onPageLoadSuccess}
                          onLoadError={(error) => console.error('Erro ao carregar página:', error)}
                          width={imageDimensions?.width}
                          height={imageDimensions?.height}
                          renderMode="canvas"
                          scale={1.5}
                          className="w-full h-auto"
                        />
                      </Document>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: imageDimensions?.width ?? '100%',
                        height: imageDimensions?.height ?? '100%',
                        backgroundImage: `url(${orcamento.imagemPlanta})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}
                  
                  {/* Postes do banco de dados (budgetDetails) */}
                  {budgetDetails && budgetDetails.map((post) => (
                    <PostIcon
                      key={post.id}
                      id={post.id}
                      name={post.name}
                      x={post.x_coord}
                      y={post.y_coord}
                      scale={scale}
                      isSelected={selectedPostDetail?.id === post.id}
                      postType={post.post_types?.name}
                      onClick={() => {
                        if (onPostDetailClick) {
                          onPostDetailClick(post);
                        }
                      }}
                    />
                  ))}

                  {/* Postes locais (fallback para dados antigos) */}
                  {(!budgetDetails || budgetDetails.length === 0) && orcamento.postes.map((poste) => (
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
                      className={`absolute cursor-pointer transition-all duration-200 z-30 ${
                        selectedPoste?.id === poste.id 
                          ? 'scale-125' 
                          : 'hover:scale-110'
                      }`}
                      style={{
                        left: `${poste.x}%`,
                        top: `${poste.y}%`,
                        transform: `translate(-50%, -50%) scale(${1 / scale})`,
                        transformOrigin: 'center',
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
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 bg-white rounded-lg shadow-lg border p-2 z-40">
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
              </TransformComponent>
            )}
          </TransformWrapper>
        </div>


      </div>
    </div>
  );
}
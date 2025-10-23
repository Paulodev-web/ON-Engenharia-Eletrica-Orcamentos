import React, { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Orcamento, Poste, TipoPoste, BudgetPostDetail, BudgetDetails } from '../types';
import { PostIcon } from './PostIcon';

// Configuração do worker do PDF
// Tenta usar CDN primeiro, com fallback para arquivo local
pdfjs.GlobalWorkerOptions.workerSrc = 
  import.meta.env.PROD 
    ? `https://unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`
    : `/pdf.worker.min.mjs`;

interface CanvasVisualProps {
  orcamento: Orcamento;
  budgetDetails?: BudgetDetails | null;
  selectedPoste: Poste | null;
  selectedPostDetail?: BudgetPostDetail | null;
  onPosteClick: (poste: Poste) => void;
  onPostDetailClick?: (post: BudgetPostDetail) => void;
  onEditPost?: (post: BudgetPostDetail) => void; // Nova prop para editar poste
  onAddPoste: (x: number, y: number, tipo: TipoPoste) => void;
  onUpdatePoste: (posteId: string, updates: Partial<Poste>) => void;
  onUploadImage: () => void;
  onDeleteImage: () => void;
  onDeletePoste: (posteId: string) => void;
  onRightClick?: (coords: {x: number, y: number}) => void;
  loadingUpload?: boolean;
}

export function CanvasVisual({ 
  orcamento, 
  budgetDetails,
  selectedPoste: _selectedPoste, 
  selectedPostDetail,
  onPosteClick: _onPosteClick, 
  onPostDetailClick,
  onEditPost,
  onAddPoste: _onAddPoste, 
  onUpdatePoste,
  onUploadImage,
  onDeleteImage,
  onDeletePoste: _onDeletePoste,
  onRightClick,
  loadingUpload = false
}: CanvasVisualProps) {
  const [selectedTipoPoste, setSelectedTipoPoste] = useState<TipoPoste>('600mm');
  const tiposPoste: TipoPoste[] = ['600mm', '1000mm', '1500mm', '2000mm'];

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

  // Estado para carregamento de imagem normal
  const [imageLoading, setImageLoading] = useState(false);
  


  // Criar quadro branco padrão quando não há imagem
  const hasImage = orcamento.imagemPlanta && orcamento.imagemPlanta.trim() !== '';
  
  // Configurar dimensões padrão para o quadro branco
  const defaultCanvasDimensions = {
    width: 6000,
    height: 6000,
    naturalWidth: 6000,
    naturalHeight: 6000
  };

  // Detectar se é PDF (só verifica se há imagem)
  const isPDF = hasImage && (
    orcamento.imagemPlanta?.toLowerCase().includes('.pdf') || 
    orcamento.imagemPlanta?.toLowerCase().includes('application/pdf') ||
    orcamento.imagemPlanta?.startsWith('data:application/pdf')
  );
  
  // Calcular dimensões da imagem quando ela mudar
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (!hasImage) {
      setImageDimensions(defaultCanvasDimensions);
    } else if (isPDF) {
      setPdfLoading(true);
      setNumPages(null);
      setPageNumber(1);
      setImageDimensions({
        width: 800,
        height: 600,
        naturalWidth: 800,
        naturalHeight: 600
      });

      timeoutId = setTimeout(() => {
        setPdfLoading(false);
      }, 10000);
    } else if (orcamento.imagemPlanta && !isPDF) {
      setImageLoading(true);
      
      const loadImage = () => {
      const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = orcamento.imagemPlanta!;
        
      img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 800;
          
        const imageAspectRatio = img.width / img.height;

        let width: number;
        let height: number;

          if (imageAspectRatio > maxWidth / maxHeight) {
            width = maxWidth;
            height = maxWidth / imageAspectRatio;
        } else {
            height = maxHeight;
            width = maxHeight * imageAspectRatio;
          }

        setImageDimensions({
          width,
          height,
          naturalWidth: img.width,
          naturalHeight: img.height
        });
          
          setImageLoading(false);
        };
        
        img.onerror = () => {
          setImageDimensions(null);
          setImageLoading(false);
        };
      };
      
      setTimeout(loadImage, 100);
    } else {
      setImageDimensions(null);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [orcamento.imagemPlanta, isPDF, hasImage]);

  // useEffect específico para centralizar imagens normais após carregamento
  useEffect(() => {
    if (hasImage && !isPDF && imageDimensions && transformRef.current) {
      const timer = setTimeout(() => {
        if (transformRef.current) {
          transformRef.current.centerView(0.8, 200);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [hasImage, isPDF, imageDimensions?.width, imageDimensions?.height]);


  // Funções para PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoading(false);
  };

  const onDocumentLoadError = () => {
    setPdfLoading(false);
    setNumPages(null);
    setImageDimensions({
      width: 800,
      height: 600,
      naturalWidth: 800,
      naturalHeight: 600
    });
  };

  const onPageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    
    const minScale = 2;
    const maxScale = 4;
    const scale = Math.max(minScale, Math.min(maxScale, 1200 / Math.max(viewport.width, viewport.height)));
    
    const finalWidth = viewport.width * scale;
    const finalHeight = viewport.height * scale;

    setImageDimensions({
      width: finalWidth,
      height: finalHeight,
        naturalWidth: viewport.width,
        naturalHeight: viewport.height
    });
    
    setPdfLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber >= 1 && numPages && newPageNumber <= numPages) {
        return newPageNumber;
      }
      return prevPageNumber;
    });
  };

  const handleCanvasClick = (_event: React.MouseEvent<HTMLDivElement>) => {
    // Remover a funcionalidade de adicionar poste com clique esquerdo
    // Agora será usado apenas o clique direito
  };

  // Função para centralizar
  const centerOnPDF = () => {
    if (transformRef.current) {
      if (!hasImage || isPDF) {
        transformRef.current.setTransform(-600, -1050, 0.4, 300, 'easeOutQuad');
      } else {
        transformRef.current.resetTransform();
      }
    }
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

  return (
    <div className="h-full flex flex-col">
      {/* Controles superiores */}
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTipoPoste}
            onChange={(e) => setSelectedTipoPoste(e.target.value as TipoPoste)}
            className="px-3 py-2 border rounded-lg"
            disabled={loadingUpload || imageLoading || pdfLoading}
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
              disabled={loadingUpload || imageLoading || pdfLoading}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={centerOnPDF}
              disabled={loadingUpload || imageLoading || pdfLoading}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!hasImage || isPDF ? "Centrar no quadro" : "Resetar zoom"}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => transformRef.current?.zoomIn()}
              disabled={loadingUpload || imageLoading || pdfLoading}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          
          <span className="text-sm text-gray-600">
            {loadingUpload ? 'Processando upload...' : 
             pdfLoading ? 'Carregando PDF...' :
             imageLoading ? 'Carregando imagem...' :
             !hasImage ? 'Clique com o botão direito no quadro branco para adicionar um poste' :
             isPDF ? 'Clique com o botão direito no PDF ou quadro branco para adicionar um poste' :
             'Clique com o botão direito na imagem para adicionar um poste'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onUploadImage}
            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loadingUpload || imageLoading || pdfLoading}
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
            disabled={loadingUpload || imageLoading || pdfLoading}
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
            key={`transform-${hasImage}-${isPDF}`} // Força re-renderização quando tipo muda
            ref={transformRef}
            minScale={0.1}
            maxScale={5}
            initialScale={hasImage && !isPDF ? 0.8 : 0.4}
            initialPositionX={hasImage && !isPDF ? 0 : -600}
            initialPositionY={hasImage && !isPDF ? 0 : -1050}
            wheel={{ step: 0.1 }}
            panning={{ disabled: false }}
            doubleClick={{ disabled: false }}
            centerOnInit={false}
            limitToBounds={false}
          >
            {(state) => {
              // Função para capturar clique direito no quadro branco (para PDFs e quadro vazio)
              const handleQuadroBrancoRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
                event.preventDefault();

                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                
                const scale = (state as any).scale || 1;
                const positionX = (state as any).positionX || 0;
                const positionY = (state as any).positionY || 0;
                
                const viewportLeft = -positionX / scale;
                const viewportTop = -positionY / scale;
                const viewportWidth = rect.width / scale;
                const viewportHeight = rect.height / scale;
                
                const x = Math.round(viewportLeft + (clickX / rect.width) * viewportWidth);
                const y = Math.round(viewportTop + (clickY / rect.height) * viewportHeight);
                
                if (x >= 0 && y >= 0 && x <= 6000 && y <= 6000) {
                  if (onRightClick) {
                    onRightClick({ x, y });
                  }
                }
              };

              // Função para imagens normais
              const handleImageRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
                event.preventDefault();
                if (!onRightClick || !imageDimensions) return;

                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                
                const x = (clickX / rect.width) * imageDimensions.width;
                const y = (clickY / rect.height) * imageDimensions.height;
                
                onRightClick({ x: Math.round(x), y: Math.round(y) });
              };

              return (
                <TransformComponent
                  wrapperClass="w-full h-full"
                  contentClass={hasImage && !isPDF ? "w-full h-full flex items-center justify-center" : "w-full h-full"}
                >


                  {/* ESTRUTURA CONDICIONAL PRINCIPAL - TRÊS CASOS DISTINTOS */}
                  {!hasImage ? (
                    // === CASO 1: QUADRO BRANCO (6000x6000px) - APENAS quando não há imagem ===
                    <div 
                      className="relative cursor-crosshair"
                      onContextMenu={handleQuadroBrancoRightClick}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      style={{
                        width: '6000px',
                        height: '6000px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        position: 'relative'
                      }}
                    >
                      {/* Loading de upload */}
                      {loadingUpload && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Fazendo upload da planta...</span>
                          </div>
                        </div>
                      )}

                      {/* PDF loading */}
                      {isPDF && pdfLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Carregando PDF...</span>
                          </div>
                        </div>
                      )}
                      

                      

                      
                      {/* Mensagem para quadro branco vazio */}
                      {!loadingUpload && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <Upload className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">Clique direito para adicionar postes</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Postes do banco de dados - Para quadro branco vazio */}
                      {budgetDetails?.posts?.map((post) => (
                        <PostIcon
                          key={post.id}
                          id={post.id}
                          name={post.name}
                          x={post.x_coord}  // USAR PIXELS DIRETOS
                          y={post.y_coord}  // USAR PIXELS DIRETOS
                          isSelected={selectedPostDetail?.id === post.id}
                          onClick={() => onPostDetailClick?.(post)}
                          onLeftClick={() => onEditPost?.(post)}
                        />
                      ))}
                    </div>
                  ) : isPDF ? (
                    // === CASO 2: PDF SIMPLES ===
                    <div 
                      className="relative"
                      style={{
                        width: '6000px',
                        height: '6000px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        position: 'relative'
                      }}
                    >
                      {/* PDF loading */}
                      {pdfLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Carregando PDF...</span>
                          </div>
                        </div>
                      )}
                      
                      {/* PDF renderizado no centro */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '3000px',
                          left: '3000px',
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      >
                        <div 
                          style={{
                            backgroundColor: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '2px solid #dee2e6',
                            pointerEvents: 'none'
                        }}
                      >
                        <Document
                          file={orcamento.imagemPlanta}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                              <div className="flex items-center justify-center p-8 text-blue-600 bg-white rounded">
                                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                                <span className="text-lg">Carregando PDF...</span>
                              </div>
                            }
                          error={
                              <div className="text-center text-red-600 p-8 bg-red-50 rounded border-2 border-red-200">
                                <p className="font-medium text-lg">Erro ao carregar PDF</p>
                                <p className="text-sm mt-2">Verifique se o arquivo é válido</p>
                            </div>
                          }
                        >
                            {numPages && (
                              <div className="bg-white" style={{ pointerEvents: 'none' }}>
                          <Page
                            pageNumber={pageNumber}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                                  onLoadSuccess={onPageLoadSuccess}
                            onLoadError={() => setPdfLoading(false)}
                                  width={imageDimensions?.width || 1200}
                            renderMode="canvas"
                                  className="shadow-xl border-2 border-gray-300"
                          />
                              </div>
                            )}
                        </Document>
                        </div>
                      </div>
                      
                      {/* CAMADA TRANSPARENTE 6000x6000 para capturar cliques - NA FRENTE DE TUDO */}
                      <div 
                        className="absolute top-0 left-0 cursor-crosshair"
                        onContextMenu={(e) => {
                          e.preventDefault();

                          const clickX = e.nativeEvent.offsetX;
                          const clickY = e.nativeEvent.offsetY;
                          
                          if (onRightClick) {
                            onRightClick({ x: clickX, y: clickY });
                          }
                        }}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        style={{
                          width: '6000px',
                          height: '6000px',
                          backgroundColor: 'transparent',
                          zIndex: 100,
                          position: 'absolute'
                        }}
                      >
                        {/* Postes renderizados na camada transparente */}
                        {budgetDetails?.posts?.map((post) => (
                          <PostIcon
                            key={post.id}
                            id={post.id}
                            name={post.name}
                            x={post.x_coord}
                            y={post.y_coord}
                            isSelected={selectedPostDetail?.id === post.id}
                            onClick={() => onPostDetailClick?.(post)}
                            onLeftClick={() => onEditPost?.(post)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    // === CASO 3: IMAGEM NORMAL (LÓGICA ORIGINAL - SEM QUADRO BRANCO) ===
                    <div 
                      className="relative cursor-crosshair flex items-center justify-center"
                      onClick={() => {
                        handleCanvasClick(undefined as any);
                      }}
                      onContextMenu={handleImageRightClick}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      style={{
                        width: '100%',
                        height: '100%',
                        minWidth: imageDimensions?.width ?? 'auto',
                        minHeight: imageDimensions?.height ?? 'auto'
                      }}
                    >
                      {/* Loading de imagem normal */}
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Carregando imagem...</span>
                          </div>
                        </div>
                      )}
                      

                      
                      {/* Imagem centralizada */}
                      {imageDimensions && !imageLoading && (
                      <div
                        style={{
                            width: imageDimensions.width,
                            height: imageDimensions.height,
                          backgroundImage: `url(${orcamento.imagemPlanta})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                            border: '2px solid #ccc',
                            borderRadius: '8px'
                          }}
                        />
                      )}
                      {/* Postes do banco de dados - Imagem Normal */}
                      {budgetDetails?.posts?.map((post) => (
                        <PostIcon
                          key={post.id}
                          id={post.id}
                          name={post.name}
                          x={post.x_coord}
                          y={post.y_coord}
                          isSelected={selectedPostDetail?.id === post.id}
                          onClick={() => onPostDetailClick?.(post)}
                          onLeftClick={() => onEditPost?.(post)}
                        />
                      ))}
                    </div>
                  )}
              </TransformComponent>
            );
            }}
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
};

export default CanvasVisual;

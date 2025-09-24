import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { CanvasVisual } from './CanvasVisual';
import { PainelConsolidado } from './PainelConsolidado';
import { Poste, TipoPoste, BudgetDetails, Material, PostMaterial } from '../types';
import { Trash2, Loader2, X, Check, Folder, TowerControl, Package, ArrowLeft, Eye, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AddPostModal } from './modals/AddPostModal';

export function AreaTrabalho() {
  // --- INÍCIO DO BLOCO DE CÓDIGO PARA SUBSTITUIR ---
  const {
    currentOrcamento,
    setCurrentView,
    budgetDetails,
    loadingBudgetDetails,
    fetchBudgetDetails,

    fetchPostTypes,
    addPostToBudget,
    deletePostFromBudget,
    uploadPlanImage,
    deletePlanImage,
    loadingUpload,
    itemGroups,
    addGroupToPost,
    fetchItemGroups,
    removeGroupFromPost,
    updateMaterialQuantityInPostGroup,
    updateOrcamento,
    
    // Funções de materiais avulsos
    addLooseMaterialToPost,
    updateLooseMaterialQuantity,
    removeLooseMaterialFromPost,
    
    // Catálogo de materiais
    materiais,
    fetchMaterials
    // Adicione aqui quaisquer outras funções/estados do context que a UI usa
  } = useApp();
  
  // Estado de visualização local
  const [activeView, setActiveView] = useState<'main' | 'consolidation'>('main');
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<any | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [removingGroup, setRemovingGroup] = useState<string | null>(null);
  
  // Estado para controlar se a planta está retraída
  const [isPlantCollapsed, setIsPlantCollapsed] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickCoordinates, setClickCoordinates] = useState<{ x: number, y: number } | null>(null);
  
  // Efeito principal e unificado para carregar TODOS os dados da AreaTrabalho
  useEffect(() => {
    const budgetId = currentOrcamento?.id;
    const companyId = currentOrcamento?.company_id;
    // Só executa se tivermos um ID de orçamento
    if (budgetId) {
      fetchBudgetDetails(budgetId);
      fetchPostTypes(); // Sempre busca o catálogo de tipos de poste
      fetchMaterials(); // Sempre busca o catálogo de materiais para "Materiais Avulsos"
      // Se tivermos um ID de empresa, busca os grupos de itens
      if (companyId) {
        fetchItemGroups(companyId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrcamento?.id, currentOrcamento?.company_id]); // Funções useCallback são estáveis
  
  // Função para ser chamada pelo clique direito no canvas
  const handleRightClick = useCallback((coords: { x: number, y: number }) => {
    setClickCoordinates(coords);
    setIsModalOpen(true);
  }, []);
  
  // Função para ser chamada pelo modal para adicionar o poste
  const handleAddPost = useCallback(async (postTypeId: string, postName: string) => {
    if (!clickCoordinates || !currentOrcamento?.id) {
      alert("Erro: Não foi possível adicionar o poste. Dados do orçamento ou coordenadas não encontrados.");
      return;
    }
    
    try {
      await addPostToBudget({
        budget_id: currentOrcamento.id,
        post_type_id: postTypeId,
        name: postName,
        x_coord: clickCoordinates.x,
        y_coord: clickCoordinates.y,
      });
      
      setIsModalOpen(false);
      setClickCoordinates(null);
    } catch (error) {
      console.error("Falha ao adicionar poste:", error);
      alert("Ocorreu um erro ao salvar o poste.");
    }
  }, [clickCoordinates, currentOrcamento, addPostToBudget]);
  // --- FIM DO BLOCO DE CÓDIGO ---

  if (!currentOrcamento) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-700">Orçamento não encontrado</h2>
          <p className="text-gray-500 mt-2">Selecione um orçamento no Dashboard</p>
        </div>
      </div>
    );
  }

  // Exibir loading state
  if (loadingBudgetDetails) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center space-y-4 bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700">Carregando orçamento</h2>
            <p className="text-gray-500 mt-2">Buscando dados do projeto "{currentOrcamento.nome}"</p>
          </div>
        </div>
      </div>
    );
  }

  // Funções de manipulação de imagem
  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentOrcamento) {
      try {
        await uploadPlanImage(currentOrcamento.id, file);
      } catch (error) {
        alert('Erro ao fazer upload da imagem. Tente novamente.');
      }
    }
    // Limpar o input para permitir upload do mesmo arquivo novamente
    event.target.value = '';
  };

  const handleDeleteImage = async () => {
    if (window.confirm('Tem certeza que deseja excluir a planta?')) {
      try {
        await deletePlanImage(currentOrcamento.id);
        setSelectedPoste(null);
        setSelectedPostDetail(null);
      } catch (error) {
        alert('Erro ao deletar a imagem. Tente novamente.');
      }
    }
  };

  // Funções legacy (manter para compatibilidade)
  const handleDeletePoste = (posteId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este poste?')) {
      const newPostes = currentOrcamento.postes.filter(p => p.id !== posteId);
      updateOrcamento(currentOrcamento.id, { postes: newPostes });
      if (selectedPoste?.id === posteId) {
        setSelectedPoste(null);
      }
    }
  };

  const addPoste = (x: number, y: number, tipo: TipoPoste) => {
    const novoPoste: Poste = {
      id: Date.now().toString(),
      nome: `P-${String(currentOrcamento.postes.length + 1).padStart(2, '0')}`,
      tipo,
      x,
      y,
      gruposItens: [],
      concluido: false,
    };

    const newPostes = [...currentOrcamento.postes, novoPoste];
    updateOrcamento(currentOrcamento.id, { postes: newPostes });
  };

  const updatePoste = (posteId: string, updates: Partial<Poste>) => {
    const newPostes = currentOrcamento.postes.map(p => 
      p.id === posteId ? { ...p, ...updates } : p
    );
    updateOrcamento(currentOrcamento.id, { postes: newPostes });
    
    if (selectedPoste && selectedPoste.id === posteId) {
      setSelectedPoste({ ...selectedPoste, ...updates });
    }
  };

  const handleDeletePostFromDatabase = async (postId: string, postName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o poste "${postName}"? Todos os grupos e materiais associados também serão removidos.`)) {
      return;
    }

    setDeletingPost(postId);
    
    try {
      await deletePostFromBudget(postId);
      
      // Se o poste excluído estava selecionado, limpar seleção
      if (selectedPostDetail?.id === postId) {
        setSelectedPostDetail(null);
      }
    } catch (error) {
      alert('Erro ao excluir poste. Tente novamente.');
    } finally {
      setDeletingPost(null);
    }
  };

  // Função para adicionar grupo ao poste
  const handleAddGrupo = async (grupoId: string, postId: string, isSupabasePost: boolean) => {
    if (isSupabasePost) {
      setAddingGroup(true);
      try {
        await addGroupToPost(grupoId, postId);
        setSearchTerm('');
      } catch (error) {
        alert('Erro ao adicionar grupo. Tente novamente.');
      } finally {
        setAddingGroup(false);
      }
    } else {
      // Fallback para dados locais
      const poste = currentOrcamento.postes.find(p => p.id === postId);
      if (poste && !poste.gruposItens.includes(grupoId)) {
        const novosGrupos = [...poste.gruposItens, grupoId];
        updatePoste(postId, { gruposItens: novosGrupos });
      }
      setSearchTerm('');
    }
  };

  // Função para remover grupo do poste
  const handleRemoveGrupo = async (grupoId: string, isSupabaseGroup: boolean = false) => {
    if (isSupabaseGroup) {
      if (!window.confirm('Tem certeza que deseja remover este grupo? Todos os materiais associados também serão removidos.')) {
        return;
      }

      setRemovingGroup(grupoId);
      
      try {
        await removeGroupFromPost(grupoId);
      } catch (error) {
        alert('Erro ao remover grupo. Tente novamente.');
      } finally {
        setRemovingGroup(null);
      }
    } else if (selectedPoste) {
      const novosGrupos = selectedPoste.gruposItens.filter(id => id !== grupoId);
      updatePoste(selectedPoste.id, { gruposItens: novosGrupos });
    }
  };

  // Renderização condicional baseada no activeView
  if (activeView === 'consolidation') {
    return (
      <div className="flex flex-col gap-6">
        {/* Cabeçalho da Consolidação */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('main')}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para Área de Trabalho</span>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal - PainelConsolidado */}
        <div>
          <PainelConsolidado
            budgetDetails={budgetDetails}
            orcamentoNome={currentOrcamento.nome}
          />
        </div>
      </div>
    );
  }

  // Visualização Principal ('main')
  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho da Visualização Principal */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{currentOrcamento.nome}</h2>
            <p className="text-sm text-gray-600 mt-1">Cliente: {currentOrcamento.clientName || 'Não definido'} • Cidade: {currentOrcamento.city || 'Não definida'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveView('consolidation')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Eye className="h-4 w-4" />
              <span>Ver Materiais Consolidados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas - Seção Superior */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300 ease-in-out" 
           style={{height: isPlantCollapsed ? '60px' : '400px'}}>
        {/* Cabeçalho da Planta com botão de retrair */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Planta do Orçamento</span>
          </div>
          <button
            onClick={() => setIsPlantCollapsed(!isPlantCollapsed)}
            className="flex items-center space-x-1 px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title={isPlantCollapsed ? 'Expandir planta' : 'Retrair planta'}
          >
            {isPlantCollapsed ? (
              <>
                <Eye className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <ChevronUp className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
        
        {/* Conteúdo da Planta - só renderiza se não estiver retraída */}
        {!isPlantCollapsed && (
          <div style={{height: 'calc(100% - 60px)'}}>
            <CanvasVisual
              orcamento={currentOrcamento}
              budgetDetails={budgetDetails}
              selectedPoste={selectedPoste}
              selectedPostDetail={selectedPostDetail}
              onPosteClick={setSelectedPoste}
              onPostDetailClick={setSelectedPostDetail}
              onAddPoste={addPoste}
              onUpdatePoste={updatePoste}
              onUploadImage={() => fileInputRef.current?.click()}
              onDeleteImage={handleDeleteImage}
              onDeletePoste={handleDeletePoste}
              onRightClick={handleRightClick}
              loadingUpload={loadingUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUploadImage}
              className="hidden"
              disabled={loadingUpload}
            />
          </div>
        )}
        
        {/* Mensagem quando retraída */}
        {isPlantCollapsed && (
          <div className="flex items-center justify-center text-sm text-gray-500 py-2">
            <EyeOff className="h-4 w-4 mr-2" />
            <span>Planta retraída - Clique no botão acima para expandir</span>
          </div>
        )}
      </div>

      {/* Lista de Postes - Seção Inferior */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <PostListAccordion
          budgetDetails={budgetDetails}
          deletingPost={deletingPost}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          addingGroup={addingGroup}
          removingGroup={removingGroup}
          handleAddGrupo={handleAddGrupo}
          handleRemoveGrupo={handleRemoveGrupo}
          handleDeletePostFromDatabase={handleDeletePostFromDatabase}
          itemGroups={itemGroups}
          updateMaterialQuantityInPostGroup={updateMaterialQuantityInPostGroup}
          materiais={materiais}
          addLooseMaterialToPost={addLooseMaterialToPost}
          updateLooseMaterialQuantity={updateLooseMaterialQuantity}
          removeLooseMaterialFromPost={removeLooseMaterialFromPost}
        />
      </div>

      {/* Modal para Adicionar Poste */}
      <AddPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        coordinates={clickCoordinates}
        onSubmit={handleAddPost}
      />
    </div>
  );
}

// Componente QuantityEditor para edição inline de quantidade
interface QuantityEditorProps {
  postGroupId: string;
  materialId: string;
  currentQuantity: number;
  unit: string;
  onUpdateQuantity: (postGroupId: string, materialId: string, newQuantity: number) => Promise<void>;
}

function QuantityEditor({ postGroupId, materialId, currentQuantity, unit, onUpdateQuantity }: QuantityEditorProps) {
  const [localQuantity, setLocalQuantity] = useState(currentQuantity);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Atualizar valor local quando prop mudar
  useEffect(() => {
    setLocalQuantity(currentQuantity);
  }, [currentQuantity]);

  // Debounce function
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleQuantityChange = useCallback((newValue: number) => {
    setLocalQuantity(newValue);

    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Se a quantidade for diferente da atual, salvar após delay
    if (newValue !== currentQuantity && newValue >= 0) {
      debounceTimer.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onUpdateQuantity(postGroupId, materialId, newValue);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 1500); // Mostrar "salvo" por 1.5s
        } catch (error) {
          console.error('Erro ao salvar quantidade:', error);
          setLocalQuantity(currentQuantity); // Reverter para valor original
          alert('Erro ao salvar quantidade. Tente novamente.');
        } finally {
          setIsSaving(false);
        }
      }, 800); // Debounce de 800ms
    }
  }, [currentQuantity, onUpdateQuantity, postGroupId, materialId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    handleQuantityChange(value);
  };

  const handleBlur = () => {
    // Garantir que o valor seja válido no blur
    if (localQuantity < 0) {
      setLocalQuantity(0);
      handleQuantityChange(0);
    }
  };

  // Cleanup do timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center space-x-1">
      <input
        type="number"
        min="0"
        value={localQuantity}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        disabled={isSaving}
      />
      <span className="text-xs text-gray-500">{unit}</span>
      
      {/* Feedback visual */}
      <div className="w-4 flex justify-center">
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
        ) : showSaved ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : null}
      </div>
    </div>
  );
}

// Componente PostListAccordion para a nova estrutura hierárquica
interface PostListAccordionProps {
  budgetDetails: BudgetDetails | null;
  deletingPost: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addingGroup: boolean;
  removingGroup: string | null;
  handleAddGrupo: (grupoId: string, postId: string, isSupabasePost: boolean) => Promise<void>;
  handleRemoveGrupo: (grupoId: string, isSupabaseGroup?: boolean) => Promise<void>;
  handleDeletePostFromDatabase: (postId: string, postName: string) => Promise<void>;
  itemGroups: any[];
  updateMaterialQuantityInPostGroup: (postGroupId: string, materialId: string, newQuantity: number) => Promise<void>;
  materiais: Material[];
  addLooseMaterialToPost: (postId: string, materialId: string, quantity: number, price: number) => Promise<void>;
  updateLooseMaterialQuantity: (postMaterialId: string, newQuantity: number) => Promise<void>;
  removeLooseMaterialFromPost: (postMaterialId: string) => Promise<void>;
}

function PostListAccordion({ 
  budgetDetails, 
  deletingPost,
  searchTerm,
  setSearchTerm,
  addingGroup,
  removingGroup,
  handleAddGrupo,
  handleRemoveGrupo,
  handleDeletePostFromDatabase,
  itemGroups,
  updateMaterialQuantityInPostGroup,
  materiais,
  addLooseMaterialToPost,
  updateLooseMaterialQuantity,
  removeLooseMaterialFromPost
}: PostListAccordionProps) {
  const postsToDisplay = budgetDetails?.posts || [];
  
  // Estados locais para materiais avulsos
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [addingLooseMaterial, setAddingLooseMaterial] = useState(false);
  const [removingLooseMaterial, setRemovingLooseMaterial] = useState<string | null>(null);
  

  
  // Usar APENAS grupos do Supabase (itemGroups) filtrados por company_id
  // Remover fallback para dados locais (gruposItens) para garantir consistência
  const availableGroups = itemGroups; // Sempre usar apenas itemGroups do banco
  
  const gruposFiltrados = availableGroups.filter((g: any) => {
    // itemGroups já vem filtrados pela empresa na função fetchItemGroups
    return g.nome.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Filtrar materiais para busca de materiais avulsos
  const materiaisFiltrados = materiais.filter(material =>
    material.descricao.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
    material.codigo.toLowerCase().includes(materialSearchTerm.toLowerCase())
  );
  
  // Função para adicionar material avulso
  const handleAddLooseMaterial = async (postId: string, materialId: string) => {
    const material = materiais.find(m => m.id === materialId);
    if (!material) return;
    
    setAddingLooseMaterial(true);
    try {
      await addLooseMaterialToPost(postId, materialId, 1, material.precoUnit);
      setMaterialSearchTerm('');
    } catch (error) {
      alert('Erro ao adicionar material avulso. Tente novamente.');
    } finally {
      setAddingLooseMaterial(false);
    }
  };
  
  // Função para remover material avulso
  const handleRemoveLooseMaterial = async (postMaterialId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este material avulso?')) {
      return;
    }
    
    setRemovingLooseMaterial(postMaterialId);
    try {
      await removeLooseMaterialFromPost(postMaterialId);
    } catch (error) {
      alert('Erro ao remover material avulso. Tente novamente.');
    } finally {
      setRemovingLooseMaterial(null);
    }
  };
  


  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Folder className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Lista de Postes</h3>
        </div>
        <span className="text-sm font-medium text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
          {postsToDisplay.length} {postsToDisplay.length === 1 ? 'poste' : 'postes'}
        </span>
      </div>

      {postsToDisplay.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <div className="text-center">
            <p>Nenhum poste foi adicionado ainda</p>
            <p className="text-sm mt-1">Adicione uma imagem de planta e clique com o botão direito nela para criar postes</p>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <Accordion type="single" collapsible className="w-full">
            {postsToDisplay.map((post: any) => {
              const postName = post.name;
              const postType = post.post_types?.name;
              const postGroups = post.post_item_groups;
            
            return (
              <AccordionItem key={post.id} value={post.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center space-x-3">
                      <TowerControl className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">{postName} - {postType || 'Tipo não definido'}</div>
                        <div className="text-sm text-gray-500">{postGroups.length} grupos de itens</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {postGroups.length} grupos
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          x:{post.x_coord}, y:{post.y_coord}
                        </span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePostFromDatabase(post.id, post.name);
                          }}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          title="Excluir poste"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePostFromDatabase(post.id, post.name);
                            }
                          }}
                        >
                          {deletingPost === post.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 px-4">
                    {/* Seção para Adicionar Grupos */}
                    <div className="border-b pb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adicionar Grupos de Itens
                        <span className="ml-2 text-xs text-blue-600">
                          (Dados do banco)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar grupos de itens..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={addingGroup}
                        />
                        {addingGroup && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          </div>
                        )}
                        {searchTerm && gruposFiltrados.length > 0 && !addingGroup && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                            {gruposFiltrados.map((grupo: any) => (
                              <button
                                key={grupo.id}
                                onClick={() => handleAddGrupo(grupo.id, post.id, true)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b last:border-b-0"
                                disabled={addingGroup}
                              >
                                <div className="font-medium text-sm">{grupo.nome}</div>
                                <div className="text-xs text-gray-500">{grupo.descricao}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accordion aninhado para grupos */}
                    {postGroups.length > 0 ? (
                      <Accordion type="multiple" className="w-full">
                        {postGroups.map((group: any) => (
                          <AccordionItem key={group.id} value={group.id}>
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center space-x-2">
                                  <Package className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">{group.name} ({group.post_item_group_materials?.length || 0} itens)</span>
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGrupo(group.id, true);
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Remover grupo"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRemoveGrupo(group.id, true);
                                    }
                                  }}
                                >
                                  {removingGroup === group.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pl-6 space-y-3 py-2">
                                {// Materiais do Supabase
                                  group.post_item_group_materials?.length > 0 ? (
                                    group.post_item_group_materials.map((material: any) => (
                                      <div key={material.material_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">{material.materials.name}</div>
                                            <div className="text-xs text-gray-500">{material.materials.code}</div>
                                          </div>
                                          <QuantityEditor
                                            postGroupId={group.id}
                                            materialId={material.material_id}
                                            currentQuantity={material.quantity}
                                            unit={material.materials.unit}
                                            onUpdateQuantity={updateMaterialQuantityInPostGroup}
                                          />
                                        </div>
                                        <div className="text-xs text-gray-600 mt-2 font-medium">
                                          R$ {material.price_at_addition.toFixed(2)} x {material.quantity} = R$ {(material.price_at_addition * material.quantity).toFixed(2)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500">Nenhum material neste grupo</p>
                                  )
                                }
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Nenhum grupo adicionado a este poste
                      </div>
                    )}
                    
                    {/* Seção de Materiais Avulsos */}
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Package className="h-4 w-4 mr-2 text-orange-600" />
                        Materiais Avulsos ({post.post_materials?.length || 0} itens)
                      </h4>
                      
                      {/* Seção para Adicionar Material Avulso */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adicionar Material Avulso
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={materialSearchTerm}
                            onChange={(e) => setMaterialSearchTerm(e.target.value)}
                            placeholder="Buscar materiais por nome ou código..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={addingLooseMaterial}
                          />
                          {addingLooseMaterial && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            </div>
                          )}
                          {materialSearchTerm && materiaisFiltrados.length > 0 && !addingLooseMaterial && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-20 shadow-lg">
                              {materiaisFiltrados.slice(0, 10).map((material) => (
                                <button
                                  key={material.id}
                                  onClick={() => handleAddLooseMaterial(post.id, material.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b last:border-b-0"
                                  disabled={addingLooseMaterial}
                                >
                                  <div className="font-medium text-sm">{material.descricao}</div>
                                  <div className="text-xs text-gray-500">
                                    {material.codigo} • R$ {material.precoUnit.toFixed(2)} / {material.unidade}
                                  </div>
                                </button>
                              ))}
                              {materiaisFiltrados.length > 10 && (
                                <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
                                  ... e mais {materiaisFiltrados.length - 10} materiais
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Lista de Materiais Avulsos */}
                      {post.post_materials && post.post_materials.length > 0 ? (
                        <div className="space-y-3">
                          {post.post_materials.map((material: PostMaterial) => (
                            <div key={material.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{material.materials.name}</div>
                                  <div className="text-xs text-gray-500">{material.materials.code}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <QuantityEditor
                                    postGroupId={material.id}
                                    materialId={material.material_id}
                                    currentQuantity={material.quantity}
                                    unit={material.materials.unit}
                                    onUpdateQuantity={async (postMaterialId, _, newQuantity) => {
                                      await updateLooseMaterialQuantity(postMaterialId, newQuantity);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleRemoveLooseMaterial(material.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                    disabled={removingLooseMaterial === material.id}
                                    title="Remover material avulso"
                                  >
                                    {removingLooseMaterial === material.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 mt-2 font-medium">
                                R$ {material.price_at_addition.toFixed(2)} x {material.quantity} = R$ {(material.price_at_addition * material.quantity).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Nenhum material avulso adicionado a este poste
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}

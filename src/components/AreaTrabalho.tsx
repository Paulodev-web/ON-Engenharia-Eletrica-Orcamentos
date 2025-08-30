import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { CanvasVisual } from './CanvasVisual';
import { PainelConsolidado } from './PainelConsolidado';
import { Poste, TipoPoste } from '../types';
import { Trash2, Loader2, X, Check, Folder, TowerControl, Package, Settings, ArrowLeft, Eye } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export function AreaTrabalho() {
  const { 
    currentOrcamento, 
    updateOrcamento,
    budgetDetails,
    loadingBudgetDetails,
    fetchBudgetDetails,
    postTypes,
    loadingPostTypes,
    fetchPostTypes,
    addPostToBudget,
    deletePostFromBudget,
    uploadPlanImage,
    deletePlanImage,
    loadingUpload,
    gruposItens,
    itemGroups,
    addGroupToPost,
    fetchItemGroups,
    removeGroupFromPost,
    updateMaterialQuantityInPostGroup,
    setCurrentView
  } = useApp();
  
  // Estado de visualização local
  const [activeView, setActiveView] = useState<'main' | 'consolidation'>('main');
  
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<any | null>(null);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [addPostPosition, setAddPostPosition] = useState<{x: number, y: number} | null>(null);
  const [addingPost, setAddingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [removingGroup, setRemovingGroup] = useState<string | null>(null);

  // Buscar detalhes do orçamento quando o currentOrcamento mudar
  useEffect(() => {
    if (currentOrcamento?.id) {
      // 1. Busca os detalhes do orçamento
      fetchBudgetDetails(currentOrcamento.id);
      
      // 2. Se o orçamento carregado tem o ID da empresa, busca os grupos.
      // A propriedade company_id vem diretamente do banco de dados.
      if (currentOrcamento.company_id) {
        console.log('[DEBUG] Orçamento carregado - buscando grupos para company_id:', currentOrcamento.company_id);
        fetchItemGroups(currentOrcamento.company_id);
      } else {
        console.log('[DEBUG] Orçamento não tem company_id definido:', currentOrcamento);
      }
    }
  }, [currentOrcamento, fetchBudgetDetails, fetchItemGroups]);

  // Buscar tipos de poste quando o componente for montado
  useEffect(() => {
    fetchPostTypes();
  }, [fetchPostTypes]);



  // Log para monitorar mudanças no itemGroups
  useEffect(() => {
    console.log('[DEBUG] AreaTrabalho - itemGroups foi atualizado:', itemGroups);
  }, [itemGroups]);

  if (!currentOrcamento) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Orçamento não encontrado</h2>
          <p className="text-gray-500 mt-2">Selecione um orçamento no Dashboard</p>
        </div>
      </div>
    );
  }

  // Exibir loading state
  if (loadingBudgetDetails) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700">Carregando orçamento</h2>
            <p className="text-gray-500 mt-2">Buscando dados do projeto "{currentOrcamento.nome}"</p>
          </div>
        </div>
      </div>
    );
  }

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentOrcamento) {
      try {
        await uploadPlanImage(currentOrcamento.id, file);
      } catch (error) {
        console.error('Erro no upload:', error);
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
        console.error('Erro ao deletar imagem:', error);
        alert('Erro ao deletar a imagem. Tente novamente.');
      }
    }
  };

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

  const handleAddNewPost = async (postTypeId: string, postName: string) => {
    if (!addPostPosition || !currentOrcamento?.id) {
      return;
    }

    setAddingPost(true);
    
    try {
      await addPostToBudget({
        budget_id: currentOrcamento.id,
        post_type_id: postTypeId,
        name: postName,
        x_coord: addPostPosition.x,
        y_coord: addPostPosition.y,
      });

      // Fechar modal e limpar posição
      setShowAddPostModal(false);
      setAddPostPosition(null);
    } catch (error) {
      console.error('Erro ao adicionar poste:', error);
      alert('Erro ao adicionar poste. Tente novamente.');
    } finally {
      setAddingPost(false);
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
      console.error('Erro ao excluir poste:', error);
      alert('Erro ao excluir poste. Tente novamente.');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleCanvasRightClick = (x: number, y: number) => {
    setAddPostPosition({ x, y });
    setShowAddPostModal(true);
  };

  // Função para adicionar grupo ao poste
  const handleAddGrupo = async (grupoId: string, postId: string, isSupabasePost: boolean) => {
    if (isSupabasePost) {
      setAddingGroup(true);
      try {
        await addGroupToPost(grupoId, postId);
        setSearchTerm('');
      } catch (error) {
        console.error('Erro ao adicionar grupo:', error);
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
        console.error('Erro ao remover grupo:', error);
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
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Cabeçalho da Consolidação */}
        <div className="bg-white border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('main')}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Materiais Consolidados</h1>
            </div>
            <button
              onClick={() => setCurrentView('configuracoes')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Configurações"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal - PainelConsolidado */}
        <div className="flex-1 p-6 overflow-y-auto">
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Cabeçalho da Visualização Principal */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{currentOrcamento.nome}</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveView('consolidation')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Eye className="h-4 w-4" />
              <span>Ver Materiais Consolidados</span>
            </button>
            <button
              onClick={() => setCurrentView('configuracoes')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Configurações"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* --- SEÇÃO SUPERIOR: CANVAS --- */}
      <div className="flex-1 relative overflow-hidden">
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
          loadingUpload={loadingUpload}
          onRightClick={handleCanvasRightClick}
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

      {/* --- SEÇÃO INFERIOR: LISTA DE POSTES --- */}
      <div className="h-1/3 bg-white border-t shadow-lg p-6 overflow-y-auto">
        <PostListAccordion
          budgetDetails={budgetDetails}
          currentOrcamento={currentOrcamento}
          deletingPost={deletingPost}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          addingGroup={addingGroup}
          removingGroup={removingGroup}
          handleAddGrupo={handleAddGrupo}
          handleRemoveGrupo={handleRemoveGrupo}
          handleDeletePostFromDatabase={handleDeletePostFromDatabase}
          handleDeletePoste={handleDeletePoste}
          gruposItens={gruposItens}
          itemGroups={itemGroups}
          updateMaterialQuantityInPostGroup={updateMaterialQuantityInPostGroup}
        />
      </div>

      {/* Modal para Adicionar Poste */}
      {showAddPostModal && (
        <AddPostModal
          isOpen={showAddPostModal}
          onClose={() => {
            setShowAddPostModal(false);
            setAddPostPosition(null);
          }}
          postTypes={postTypes}
          loadingPostTypes={loadingPostTypes}
          addingPost={addingPost}
          position={addPostPosition}
          onConfirm={handleAddNewPost}
        />
      )}
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
  budgetDetails: any[] | null;
  currentOrcamento: any;
  deletingPost: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addingGroup: boolean;
  removingGroup: string | null;
  handleAddGrupo: (grupoId: string, postId: string, isSupabasePost: boolean) => Promise<void>;
  handleRemoveGrupo: (grupoId: string, isSupabaseGroup?: boolean) => Promise<void>;
  handleDeletePostFromDatabase: (postId: string, postName: string) => Promise<void>;
  handleDeletePoste: (posteId: string) => void;
  gruposItens: any[];
  itemGroups: any[];
  updateMaterialQuantityInPostGroup: (postGroupId: string, materialId: string, newQuantity: number) => Promise<void>;
}

function PostListAccordion({ 
  budgetDetails, 
  currentOrcamento, 
  deletingPost,
  searchTerm,
  setSearchTerm,
  addingGroup,
  removingGroup,
  handleAddGrupo,
  handleRemoveGrupo,
  handleDeletePostFromDatabase,
  handleDeletePoste,
  gruposItens,
  itemGroups,
  updateMaterialQuantityInPostGroup
}: PostListAccordionProps) {
  const postsToDisplay = budgetDetails && budgetDetails.length > 0 ? budgetDetails : currentOrcamento.postes;
  const isSupabaseData = budgetDetails && budgetDetails.length > 0;
  
  // Debug logs para rastrear o fluxo de dados
  console.log('[DEBUG] Orçamento atual:', currentOrcamento);
  console.log('[DEBUG] Todos os templates de grupo disponíveis no estado:', itemGroups);
  
  // Usar APENAS grupos do Supabase (itemGroups) filtrados por company_id
  // Remover fallback para dados locais (gruposItens) para garantir consistência
  const availableGroups = itemGroups; // Sempre usar apenas itemGroups do banco
  
  const gruposFiltrados = availableGroups.filter((g: any) => {
    // itemGroups já vem filtrados pela empresa na função fetchItemGroups
    return g.nome.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  console.log('[DEBUG] Grupos filtrados para este orçamento:', gruposFiltrados);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Folder className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Lista de Postes</h3>
        </div>
        <span className="text-sm font-medium text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
          {postsToDisplay.length} postes {isSupabaseData ? '(banco)' : '(local)'}
        </span>
      </div>

      {postsToDisplay.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum poste foi adicionado ainda</p>
          <p className="text-sm mt-1">Adicione uma imagem de planta e clique com o botão direito nela para criar postes</p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {postsToDisplay.map((post: any) => {
            const postName = isSupabaseData ? post.name : post.nome;
            const postType = isSupabaseData ? post.post_types?.name : post.tipo;
            const postGroups = isSupabaseData ? post.post_item_groups : 
              post.gruposItens.map((groupId: string) => gruposItens.find(g => g.id === groupId)).filter(Boolean);
            
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
                          x:{isSupabaseData ? post.x_coord : post.x}, y:{isSupabaseData ? post.y_coord : post.y}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSupabaseData) {
                              handleDeletePostFromDatabase(post.id, post.name);
                            } else {
                              handleDeletePoste(post.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          disabled={deletingPost === post.id}
                        >
                          {deletingPost === post.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
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
                        {isSupabaseData && (
                          <span className="ml-2 text-xs text-blue-600">
                            (Dados do banco)
                          </span>
                        )}
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
                                onClick={() => handleAddGrupo(grupo.id, post.id, isSupabaseData || false)}
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
                                  <span className="text-sm font-medium">{group.name || group.nome} ({isSupabaseData ? group.post_item_group_materials?.length || 0 : group.materiais?.length || 0} itens)</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGrupo(group.id, isSupabaseData || false);
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                  disabled={removingGroup === group.id}
                                  title="Remover grupo"
                                >
                                  {removingGroup === group.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pl-6 space-y-3 py-2">
                                {isSupabaseData ? (
                                  // Materiais do Supabase
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
                                ) : (
                                  // Materiais locais (fallback)
                                  group.materiais?.length > 0 ? (
                                    group.materiais.map((material: any) => (
                                      <div key={material.materialId} className="bg-gray-50 p-3 rounded-md">
                                        <div className="text-sm font-medium">Material ID: {material.materialId}</div>
                                        <div className="text-xs text-gray-500">Quantidade: {material.quantidade}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500">Nenhum material neste grupo</p>
                                  )
                                )}
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

// Componente Modal para Adicionar Poste
interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTypes: any[];
  loadingPostTypes: boolean;
  addingPost: boolean;
  position: {x: number, y: number} | null;
  onConfirm: (postTypeId: string, postName: string) => Promise<void>;
}

function AddPostModal({ isOpen, onClose, postTypes, loadingPostTypes, addingPost, position, onConfirm }: AddPostModalProps) {
  const [selectedPostType, setSelectedPostType] = useState('');
  const [postName, setPostName] = useState('');

  useEffect(() => {
    if (isOpen && !loadingPostTypes && postTypes.length > 0) {
      // Gerar nome padrão baseado na quantidade de postes existentes
      const defaultName = `P-${String((postTypes.length || 0) + 1).padStart(2, '0')}`;
      setPostName(defaultName);
    }
  }, [isOpen, loadingPostTypes, postTypes.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPostType || !postName.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    await onConfirm(selectedPostType, postName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adicionar Novo Poste</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={addingPost}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {position && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Posição: X: {position.x}, Y: {position.y}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="postName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Poste *
            </label>
            <input
              type="text"
              id="postName"
              value={postName}
              onChange={(e) => setPostName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: P-01"
              required
              disabled={addingPost}
            />
          </div>

          <div>
            <label htmlFor="postType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Poste *
            </label>
            {loadingPostTypes ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-500">Carregando tipos...</span>
              </div>
            ) : (
              <select
                id="postType"
                value={selectedPostType}
                onChange={(e) => setSelectedPostType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={addingPost}
              >
                <option value="">Selecione um tipo de poste</option>
                {postTypes.map((postType) => (
                  <option key={postType.id} value={postType.id}>
                    {postType.name} {postType.code && `(${postType.code})`} - R$ {postType.price.toFixed(2)}
                    {postType.height_m && ` - ${postType.height_m}m`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={addingPost}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={addingPost || loadingPostTypes || postTypes.length === 0}
            >
              {addingPost ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <span>Adicionar Poste</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
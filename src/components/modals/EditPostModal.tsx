import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Loader2, Search, Plus, Minus, Package, Folder, ArrowUpDown, ArrowUp, ArrowDown, Check, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAlertDialog } from '../../hooks/useAlertDialog';
import { AlertDialog } from '../ui/alert-dialog';
import { Material, BudgetPostDetail } from '../../types';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BudgetPostDetail | null;
}

type TabType = 'info' | 'groups' | 'materials';
type SortField = 'descricao' | 'codigo' | 'precoUnit';
type SortOrder = 'asc' | 'desc';

export function EditPostModal({ isOpen, onClose, post }: EditPostModalProps) {
  const { 
    itemGroups, 
    loadingGroups,
    materiais,
    loadingMaterials,
    currentOrcamento,
    budgetDetails,
    fetchItemGroups,
    addGroupToPost,
    removeGroupFromPost,
    updateMaterialQuantityInPostGroup,
    removeMaterialFromPostGroup,
    addLooseMaterialToPost,
    updateLooseMaterialQuantity,
    removeLooseMaterialFromPost,
    deletePostFromBudget,
    fetchBudgetDetails
  } = useApp();
  
  const alertDialog = useAlertDialog();
  
  // Estados das abas
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // Estados dos grupos
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [removingGroup, setRemovingGroup] = useState<string | null>(null);
  const [removingMaterialFromGroup, setRemovingMaterialFromGroup] = useState<{postGroupId: string, materialId: string} | null>(null);
  
  // Estados dos materiais avulsos
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [removingMaterial, setRemovingMaterial] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('descricao');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [inputStates, setInputStates] = useState<Record<string, string>>({});
  
  // Estados de edição de quantidade
  const [editingQuantities, setEditingQuantities] = useState<Record<string, boolean>>({});
  
  // Estado local do poste atualizado
  const [currentPost, setCurrentPost] = useState<BudgetPostDetail | null>(post);
  
  // Ref para rastrear se o modal acabou de abrir (evita resets desnecessários)
  const lastOpenState = useRef(false);
  const hasInitialized = useRef(false);
  const initialPostId = useRef<string | null>(null);

  // Effect 1: Detectar APENAS abertura/fechamento do modal (só depende de isOpen)
  useEffect(() => {
    const justOpened = isOpen && !lastOpenState.current;
    const justClosed = !isOpen && lastOpenState.current;
    
    if (justOpened) {
      hasInitialized.current = false;
      initialPostId.current = post?.id || null;
    }
    
    if (justClosed) {
      hasInitialized.current = false;
      initialPostId.current = null;
    }
    
    lastOpenState.current = isOpen;
  }, [isOpen, post?.id]);

  // Effect 2: Inicializar dados APENAS na primeira vez que o modal abre
  useEffect(() => {
    if (isOpen && post && !hasInitialized.current) {
      setGroupSearchTerm('');
      setMaterialSearchTerm('');
      setActiveTab('info');
      setInputStates({});
      setCurrentPost(post);
      
      // Carregar grupos da concessionária atual
      if (currentOrcamento?.company_id) {
        fetchItemGroups(currentOrcamento.company_id);
      }
      
      hasInitialized.current = true;
    }
  }, [isOpen, post, currentOrcamento, fetchItemGroups]);
  
  // Effect 3: Atualizar SILENCIOSAMENTE os dados quando budgetDetails mudar
  useEffect(() => {
    if (isOpen && post && budgetDetails && hasInitialized.current) {
      const updatedPost = budgetDetails.posts.find(p => p.id === post.id);
      if (updatedPost) {
        setCurrentPost(updatedPost);
      }
    }
  }, [budgetDetails, isOpen, post]);

  // Função para adicionar grupo ao poste
  const handleAddGroup = async (groupId: string) => {
    if (!currentPost) return;
    
    setAddingGroup(true);
    try {
      // addGroupToPost já atualiza budgetDetails automaticamente
      await addGroupToPost(groupId, currentPost.id);
      
      // Limpar apenas o campo de busca após adicionar
      setGroupSearchTerm('');
      
      // NÃO chamar fetchBudgetDetails - a função já atualizou o estado
      // O useEffect detectará a mudança em budgetDetails e atualizará currentPost
      
      alertDialog.showSuccess(
        'Grupo Adicionado',
        'O grupo foi adicionado com sucesso ao poste.'
      );
    } catch (error) {
      alertDialog.showError(
        'Erro ao Adicionar Grupo',
        'Não foi possível adicionar o grupo. Tente novamente.'
      );
    } finally {
      setAddingGroup(false);
    }
  };

  // Função para remover grupo do poste
  const handleRemoveGroup = async (groupId: string) => {
    alertDialog.showConfirm(
      'Remover Grupo',
      'Tem certeza que deseja remover este grupo? Todos os materiais associados também serão removidos.',
      async () => {
        setRemovingGroup(groupId);
        try {
          // removeGroupFromPost já atualiza budgetDetails automaticamente
          await removeGroupFromPost(groupId);
          
          // NÃO chamar fetchBudgetDetails - a função já atualizou o estado
          
          alertDialog.showSuccess(
            'Grupo Removido',
            'O grupo foi removido com sucesso.'
          );
        } catch (error) {
          alertDialog.showError(
            'Erro ao Remover',
            'Não foi possível remover o grupo. Tente novamente.'
          );
        } finally {
          setRemovingGroup(null);
        }
      },
      {
        type: 'destructive',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      }
    );
  };

  // Função para atualizar quantidade de material em grupo
  const handleUpdateGroupMaterialQuantity = async (
    postGroupId: string, 
    materialId: string, 
    newQuantity: number
  ) => {
    setEditingQuantities(prev => ({ ...prev, [`${postGroupId}-${materialId}`]: true }));
    try {
      await updateMaterialQuantityInPostGroup(postGroupId, materialId, newQuantity);
    } catch (error) {
      alertDialog.showError(
        'Erro ao Atualizar',
        'Não foi possível atualizar a quantidade. Tente novamente.'
      );
    } finally {
      setEditingQuantities(prev => ({ ...prev, [`${postGroupId}-${materialId}`]: false }));
    }
  };

  // Função para remover material de um grupo
  const handleRemoveMaterialFromGroup = async (postGroupId: string, materialId: string, materialName: string) => {
    alertDialog.showConfirm(
      'Remover Material',
      `Tem certeza que deseja remover "${materialName}" deste grupo? Esta ação não pode ser desfeita.`,
      async () => {
        setRemovingMaterialFromGroup({ postGroupId, materialId });
        try {
          await removeMaterialFromPostGroup(postGroupId, materialId);
          
          alertDialog.showSuccess(
            'Material Removido',
            'O material foi removido do grupo com sucesso.'
          );
        } catch (error) {
          alertDialog.showError(
            'Erro ao Remover',
            'Não foi possível remover o material. Tente novamente.'
          );
        } finally {
          setRemovingMaterialFromGroup(null);
        }
      },
      {
        type: 'destructive',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      }
    );
  };

  // Função para adicionar material avulso
  const handleAddLooseMaterial = async (materialId: string) => {
    if (!currentPost) return;
    
    const material = materiais.find(m => m.id === materialId);
    if (!material) return;
    
    setIsAddingMaterial(true);
    try {
      // addLooseMaterialToPost já atualiza budgetDetails automaticamente
      await addLooseMaterialToPost(currentPost.id, materialId, 1, material.precoUnit);
      
      // Limpar apenas o campo de busca após adicionar
      setMaterialSearchTerm('');
      
      // NÃO chamar fetchBudgetDetails - a função já atualizou o estado
      
      alertDialog.showSuccess(
        'Material Adicionado',
        'O material foi adicionado com sucesso ao poste.'
      );
    } catch (error) {
      alertDialog.showError(
        'Erro ao Adicionar Material',
        'Não foi possível adicionar o material. Tente novamente.'
      );
    } finally {
      setIsAddingMaterial(false);
    }
  };

  // Função para remover material avulso
  const handleRemoveLooseMaterial = async (postMaterialId: string) => {
    alertDialog.showConfirm(
      'Remover Material',
      'Tem certeza que deseja remover este material avulso?',
      async () => {
        setRemovingMaterial(postMaterialId);
        try {
          // removeLooseMaterialFromPost já atualiza budgetDetails automaticamente
          await removeLooseMaterialFromPost(postMaterialId);
          
          // NÃO chamar fetchBudgetDetails - a função já atualizou o estado
          
          alertDialog.showSuccess(
            'Material Removido',
            'O material foi removido com sucesso.'
          );
        } catch (error) {
          alertDialog.showError(
            'Erro ao Remover',
            'Não foi possível remover o material. Tente novamente.'
          );
        } finally {
          setRemovingMaterial(null);
        }
      },
      {
        type: 'destructive',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      }
    );
  };

  // Função para atualizar quantidade de material avulso
  const handleUpdateLooseMaterialQuantity = async (postMaterialId: string, newQuantity: number) => {
    setEditingQuantities(prev => ({ ...prev, [postMaterialId]: true }));
    try {
      await updateLooseMaterialQuantity(postMaterialId, newQuantity);
    } catch (error) {
      alertDialog.showError(
        'Erro ao Atualizar',
        'Não foi possível atualizar a quantidade. Tente novamente.'
      );
    } finally {
      setEditingQuantities(prev => ({ ...prev, [postMaterialId]: false }));
    }
  };

  // Função para excluir o poste
  const handleDeletePost = () => {
    if (!currentPost) return;
    
    alertDialog.showConfirm(
      'Excluir Poste',
      `Tem certeza que deseja excluir o poste "${currentPost.name}"? Esta ação não pode ser desfeita e todos os grupos e materiais associados também serão removidos.`,
      async () => {
        try {
          await deletePostFromBudget(currentPost.id);
          
          alertDialog.showSuccess(
            'Poste Excluído',
            'O poste foi excluído com sucesso.'
          );
          
          // Fechar o modal após excluir
          onClose();
        } catch (error) {
          alertDialog.showError(
            'Erro ao Excluir',
            'Não foi possível excluir o poste. Tente novamente.'
          );
        }
      },
      {
        type: 'destructive',
        confirmText: 'Excluir Poste',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />;
  }, [sortField, sortOrder]);

  // Função para calcular relevância da busca
  const getSearchRelevance = useCallback((material: Material, term: string): number => {
    if (!term) return 0;
    
    const searchLower = term.toLowerCase();
    const codigoLower = material.codigo.toLowerCase();
    const descricaoLower = material.descricao.toLowerCase();
    
    let score = 0;
    
    if (codigoLower === searchLower) {
      score += 1000;
    } else if (codigoLower.startsWith(searchLower)) {
      score += 500;
    } else if (codigoLower.includes(searchLower)) {
      score += 100;
    }
    
    const palavras = descricaoLower.split(/\s+/);
    
    if (palavras.some(palavra => palavra === searchLower)) {
      score += 800;
    }
    
    const palavrasComeçam = palavras.filter(palavra => palavra.startsWith(searchLower));
    if (palavrasComeçam.length > 0) {
      score += 400 * palavrasComeçam.length;
    }
    
    if (palavras[0]?.startsWith(searchLower)) {
      score += 300;
    }
    
    if (descricaoLower.startsWith(searchLower)) {
      score += 200;
    }
    
    if (descricaoLower.includes(searchLower)) {
      score += 50;
    }
    
    return score;
  }, []);

  // Filtros
  const filteredGroups = useMemo(() => {
    if (!currentPost) return [];
    
    // Permitir adicionar o mesmo grupo múltiplas vezes
    // Filtrar apenas pela busca, sem remover grupos já existentes
    return itemGroups.filter(group => {
      const matchesSearch = group.nome.toLowerCase().includes(groupSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [itemGroups, groupSearchTerm]);

  const filteredMaterials = useMemo(() => {
    return materiais
      .filter(material => {
        const searchLower = materialSearchTerm.toLowerCase();
        return material.descricao.toLowerCase().includes(searchLower) ||
               material.codigo.toLowerCase().includes(searchLower);
      })
      .map(material => ({
        material,
        relevance: materialSearchTerm ? getSearchRelevance(material, materialSearchTerm) : 0
      }))
      .sort((a, b) => {
        if (materialSearchTerm) {
          const relevanceDiff = b.relevance - a.relevance;
          if (relevanceDiff !== 0) return relevanceDiff;
        }
        
        let comparison = 0;
        
        switch (sortField) {
          case 'descricao':
            comparison = a.material.descricao.localeCompare(b.material.descricao, 'pt-BR', { sensitivity: 'base' });
            break;
          case 'codigo':
            comparison = a.material.codigo.localeCompare(b.material.codigo, 'pt-BR', { sensitivity: 'base' });
            break;
          case 'precoUnit':
            comparison = a.material.precoUnit - b.material.precoUnit;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      })
      .map(item => item.material);
  }, [materiais, materialSearchTerm, sortField, sortOrder, getSearchRelevance]);

  const availableMaterials = useMemo(() => {
    if (!currentPost) return [];
    
    const existingMaterialIds = currentPost.post_materials.map(m => m.material_id);
    
    return filteredMaterials.filter(material => {
      return !existingMaterialIds.includes(material.id);
    });
  }, [filteredMaterials, currentPost]);

  if (!isOpen || !currentPost) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar Poste: {currentPost.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentPost.post_types?.name} • Coordenadas: x:{currentPost.x_coord.toFixed(2)}, y:{currentPost.y_coord.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Informações</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>Grupos de Itens</span>
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {currentPost.post_item_groups.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Materiais Avulsos</span>
              <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                {currentPost.post_materials.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Aba Informações */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Informações do Poste</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Nome:</span>
                    <span className="text-blue-900">{currentPost.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Tipo:</span>
                    <span className="text-blue-900">{currentPost.post_types?.name || 'Não definido'}</span>
                  </div>
                  {currentPost.post_types?.code && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Código:</span>
                      <span className="text-blue-900">{currentPost.post_types.code}</span>
                    </div>
                  )}
                  {currentPost.post_types?.height_m && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Altura:</span>
                      <span className="text-blue-900">{currentPost.post_types.height_m}m</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Preço do Poste:</span>
                    <span className="text-blue-900 font-semibold">R$ {currentPost.post_types?.price.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Coordenadas:</span>
                    <span className="text-blue-900">x: {currentPost.x_coord.toFixed(2)}, y: {currentPost.y_coord.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Grupos de Itens</h4>
                  <div className="text-3xl font-bold text-green-700">{currentPost.post_item_groups.length}</div>
                  <p className="text-sm text-green-600 mt-1">grupos vinculados</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Materiais Avulsos</h4>
                  <div className="text-3xl font-bold text-orange-700">{currentPost.post_materials.length}</div>
                  <p className="text-sm text-orange-600 mt-1">materiais adicionados</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Resumo de Materiais</h4>
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Use as abas acima para gerenciar grupos e materiais avulsos deste poste.</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li><strong>Grupos de Itens:</strong> Conjuntos predefinidos de materiais</li>
                    <li><strong>Materiais Avulsos:</strong> Materiais individuais adicionados diretamente</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Aba Grupos de Itens */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              {/* Adicionar Novos Grupos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar Grupos de Itens
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar grupos..."
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={addingGroup}
                  />
                  {addingGroup && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>

                {groupSearchTerm && filteredGroups.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                    {filteredGroups.map((group, index) => {
                      // Contar quantas vezes o grupo já foi adicionado
                      const existingCount = currentPost?.post_item_groups.filter(
                        g => g.template_id === group.id
                      ).length || 0;
                      
                      return (
                        <button
                          key={`search-group-${group.id}-${index}`}
                          onClick={() => handleAddGroup(group.id)}
                          disabled={addingGroup}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{group.nome}</div>
                              <div className="text-xs text-gray-500">{group.descricao}</div>
                            </div>
                            {existingCount > 0 && (
                              <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                {existingCount}x no poste
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {groupSearchTerm && filteredGroups.length === 0 && (
                  <div className="mt-2 text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">
                    Nenhum grupo disponível para adicionar
                  </div>
                )}
              </div>

              {/* Lista de Grupos Existentes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Grupos Vinculados ao Poste</h4>
                {currentPost.post_item_groups.length > 0 ? (
                  <div className="space-y-3">
                    {currentPost.post_item_groups.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg">
                        <div className="bg-green-50 p-4 rounded-t-lg border-b border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Folder className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-gray-900">{group.name}</span>
                              <span className="text-sm text-gray-600">
                                ({group.post_item_group_materials?.length || 0} materiais)
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveGroup(group.id)}
                              disabled={removingGroup === group.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                              title="Remover grupo"
                            >
                              {removingGroup === group.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Materiais do Grupo */}
                        <div className="p-4 space-y-2">
                          {group.post_item_group_materials && group.post_item_group_materials.length > 0 ? (
                            group.post_item_group_materials.map((material) => (
                              <div key={material.material_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{material.materials.name}</div>
                                  <div className="text-xs text-gray-500">{material.materials.code}</div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={inputStates[`${group.id}-${material.material_id}`] !== undefined 
                                        ? inputStates[`${group.id}-${material.material_id}`] 
                                        : material.quantity}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Permitir campo vazio durante edição
                                        setInputStates(prev => ({ ...prev, [`${group.id}-${material.material_id}`]: value }));
                                        
                                        // Só atualizar se o valor for válido e maior que 0
                                        const normalizedValue = value.replace(',', '.');
                                        const numValue = parseFloat(normalizedValue);
                                        if (!isNaN(numValue) && numValue >= 0 && value !== '') {
                                          handleUpdateGroupMaterialQuantity(group.id, material.material_id, numValue);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const value = e.target.value;
                                        const normalizedValue = value.replace(',', '.');
                                        const numValue = parseFloat(normalizedValue);
                                        
                                        // Se o campo estiver vazio ou inválido, restaurar o valor original
                                        if (value === '' || isNaN(numValue) || numValue < 0) {
                                          setInputStates(prev => {
                                            const newState = { ...prev };
                                            delete newState[`${group.id}-${material.material_id}`];
                                            return newState;
                                          });
                                        } else {
                                          // Garantir que o valor foi salvo
                                          handleUpdateGroupMaterialQuantity(group.id, material.material_id, numValue);
                                          // Limpar o estado do input após salvar
                                          setInputStates(prev => {
                                            const newState = { ...prev };
                                            delete newState[`${group.id}-${material.material_id}`];
                                            return newState;
                                          });
                                        }
                                      }}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600">{material.materials.unit}</span>
                                    {editingQuantities[`${group.id}-${material.material_id}`] && (
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 min-w-[100px] text-right">
                                    R$ {(material.price_at_addition * material.quantity).toFixed(2)}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveMaterialFromGroup(group.id, material.material_id, material.materials.name)}
                                    disabled={removingMaterialFromGroup?.postGroupId === group.id && removingMaterialFromGroup?.materialId === material.material_id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                                    title="Remover material do grupo"
                                  >
                                    {removingMaterialFromGroup?.postGroupId === group.id && removingMaterialFromGroup?.materialId === material.material_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">Nenhum material neste grupo</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">Nenhum grupo vinculado a este poste</p>
                    <p className="text-sm text-gray-400 mt-1">Use a busca acima para adicionar grupos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba Materiais Avulsos */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {/* Adicionar Novos Materiais */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar Materiais Avulsos
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar materiais..."
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isAddingMaterial}
                  />
                  {materialSearchTerm && (
                    <button
                      onClick={() => setMaterialSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Limpar busca"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  {isAddingMaterial && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>

                {/* Feedback de busca */}
                {materialSearchTerm && (
                  <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">
                        🔍 Buscando: "{materialSearchTerm}"
                      </span>
                      <span className="text-blue-600">
                        {availableMaterials.length} resultado{availableMaterials.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Controles de ordenação */}
                <div className="flex items-center space-x-2 text-xs mb-3">
                  <span className="text-gray-500">Ordenar:</span>
                  <button
                    type="button"
                    onClick={() => handleSort('descricao')}
                    className={`flex items-center px-2 py-1 rounded transition-colors ${
                      sortField === 'descricao'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Descrição
                    {getSortIcon('descricao')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort('codigo')}
                    className={`flex items-center px-2 py-1 rounded transition-colors ${
                      sortField === 'codigo'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Código
                    {getSortIcon('codigo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort('precoUnit')}
                    className={`flex items-center px-2 py-1 rounded transition-colors ${
                      sortField === 'precoUnit'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Preço
                    {getSortIcon('precoUnit')}
                  </button>
                </div>

                {loadingMaterials ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando materiais...</span>
                  </div>
                ) : materialSearchTerm && availableMaterials.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                    {availableMaterials.slice(0, 10).map((material) => (
                      <button
                        key={material.id}
                        onClick={() => handleAddLooseMaterial(material.id)}
                        disabled={isAddingMaterial}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm">{material.descricao}</div>
                          <div className="text-xs text-gray-500">
                            {material.codigo} • R$ {material.precoUnit.toFixed(2)} / {material.unidade}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-blue-600" />
                      </button>
                    ))}
                    {availableMaterials.length > 10 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
                        ... e mais {availableMaterials.length - 10} materiais
                      </div>
                    )}
                  </div>
                ) : materialSearchTerm ? (
                  <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">
                    Nenhum material disponível para adicionar
                  </div>
                ) : null}
              </div>

              {/* Lista de Materiais Avulsos Existentes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Materiais Avulsos do Poste</h4>
                {currentPost.post_materials.length > 0 ? (
                  <div className="space-y-2">
                    {currentPost.post_materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{material.materials.name}</div>
                          <div className="text-xs text-gray-500">{material.materials.code}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={inputStates[`loose-${material.id}`] !== undefined 
                                ? inputStates[`loose-${material.id}`] 
                                : material.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir campo vazio durante edição
                                setInputStates(prev => ({ ...prev, [`loose-${material.id}`]: value }));
                                
                                // Só atualizar se o valor for válido e maior ou igual a 0
                                const normalizedValue = value.replace(',', '.');
                                const numValue = parseFloat(normalizedValue);
                                if (!isNaN(numValue) && numValue >= 0 && value !== '') {
                                  handleUpdateLooseMaterialQuantity(material.id, numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const normalizedValue = value.replace(',', '.');
                                const numValue = parseFloat(normalizedValue);
                                
                                // Se o campo estiver vazio ou inválido, restaurar o valor original
                                if (value === '' || isNaN(numValue) || numValue < 0) {
                                  setInputStates(prev => {
                                    const newState = { ...prev };
                                    delete newState[`loose-${material.id}`];
                                    return newState;
                                  });
                                } else {
                                  // Garantir que o valor foi salvo
                                  handleUpdateLooseMaterialQuantity(material.id, numValue);
                                  // Limpar o estado do input após salvar
                                  setInputStates(prev => {
                                    const newState = { ...prev };
                                    delete newState[`loose-${material.id}`];
                                    return newState;
                                  });
                                }
                              }}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">{material.materials.unit}</span>
                            {editingQuantities[material.id] && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 min-w-[100px] text-right">
                            R$ {(material.price_at_addition * material.quantity).toFixed(2)}
                          </div>
                          <button
                            onClick={() => handleRemoveLooseMaterial(material.id)}
                            disabled={removingMaterial === material.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                            title="Remover material"
                          >
                            {removingMaterial === material.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">Nenhum material avulso vinculado a este poste</p>
                    <p className="text-sm text-gray-400 mt-1">Use a busca acima para adicionar materiais</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleDeletePost}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              title="Excluir poste"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir Poste</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4" />
                <span>Concluir</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}


import React, { useState, useEffect, useCallback, useMemo, ErrorInfo } from 'react';
import { X, Loader2, Search, Plus, Minus, Package, Folder } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAlertDialog } from '../../hooks/useAlertDialog';
import { AlertDialog } from '../ui/alert-dialog';

// ErrorBoundary específico para o modal
class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('Erro no modal:', error);
    
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Erro no Modal</h3>
            <p className="text-gray-600 mb-4">Ocorreu um erro inesperado. Tente novamente.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onError) {
                  this.props.onError();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: {x: number, y: number} | null;
  onSubmit: (postTypeId: string, postName: string) => Promise<void>;
  onSubmitWithItems?: (postTypeId: string, postName: string, selectedGroups: string[], selectedMaterials: {materialId: string, quantity: number}[]) => Promise<void>;
}

type TabType = 'post' | 'groups' | 'materials';

function AddPostModalContent({ isOpen, onClose, coordinates, onSubmit, onSubmitWithItems }: AddPostModalProps) {
  const { 
    postTypes, 
    loadingPostTypes, 
    itemGroups, 
    loadingGroups,
    materiais,
    loadingMaterials,
    currentOrcamento,
    fetchItemGroups 
  } = useApp();
  
  const alertDialog = useAlertDialog();
  
  // Estados básicos do poste
  const [postName, setPostName] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados das abas
  const [activeTab, setActiveTab] = useState<TabType>('post');
  
  // Estados dos grupos
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  
  // Estados dos materiais avulsos
  const [selectedMaterials, setSelectedMaterials] = useState<{materialId: string, quantity: number}[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Resetar formulário quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Usar setTimeout para garantir que a limpeza aconteça após a renderização
      setTimeout(() => {
        setPostName('');
        setSelectedPostType('');
        setSelectedGroups([]);
        setSelectedMaterials([]);
        setGroupSearchTerm('');
        setMaterialSearchTerm('');
        setActiveTab('post');
      }, 0);
      
      // Carregar grupos da concessionária atual
      if (currentOrcamento?.company_id) {
        fetchItemGroups(currentOrcamento.company_id);
      }
    }
  }, [isOpen, currentOrcamento, fetchItemGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPostType || !postName.trim()) {
      alertDialog.showError(
        'Campos Obrigatórios',
        'Por favor, preencha todos os campos obrigatórios.'
      );
      return;
    }

    // Prevenir dupla submissão
    if (isSubmitting) {
      return;
    }


    setIsSubmitting(true);
    
    try {
      // Aguardar um tick para garantir que o estado está sincronizado
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (onSubmitWithItems && (selectedGroups.length > 0 || selectedMaterials.length > 0)) {
        await onSubmitWithItems(selectedPostType, postName.trim(), selectedGroups, selectedMaterials);
      } else {
        await onSubmit(selectedPostType, postName.trim());
      }
      
      // Aguardar um tick antes de fechar o modal
      await new Promise(resolve => setTimeout(resolve, 100));
      alertDialog.showSuccess(
        'Poste Adicionado',
        'O poste foi adicionado com sucesso ao orçamento.'
      );
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar poste:', error);
      alertDialog.showError(
        'Erro ao Adicionar Poste',
        'Não foi possível adicionar o poste. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções para grupos
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSelection = prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      return newSelection;
    });
  };

  // Funções para materiais (com useCallback para evitar re-renderizações desnecessárias)
  const addMaterial = useCallback(async (materialId: string) => {
    try {
      // Prevenir dupla adição
      if (isAddingMaterial) {
        return;
      }
      
      // Criar uma snapshot do estado atual para evitar race conditions
      const currentMaterials = [...selectedMaterials];
      const materialExists = currentMaterials.find(m => m.materialId === materialId);
      
      if (materialExists) {
        return;
      }
      
      setIsAddingMaterial(true);
      
      // Aguardar um tick para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Usar uma função que não depende do estado anterior para evitar stale closures
      setSelectedMaterials(currentMaterials => {
        // Verificar novamente se o material já foi adicionado
        if (currentMaterials.find(m => m.materialId === materialId)) {
          return currentMaterials;
        }
        
        const newSelection = [...currentMaterials, { materialId, quantity: 1 }];
        return newSelection;
      });
      
      // Aguardar outro tick para garantir que a renderização foi processada
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      throw error; // Re-throw para ser capturado pelo ErrorBoundary
    } finally {
      setIsAddingMaterial(false);
    }
  }, []);

  const removeMaterial = useCallback((materialId: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.materialId !== materialId));
  }, []);

  const updateMaterialQuantity = useCallback((materialId: string, quantity: number) => {
    if (quantity <= 0) {
      removeMaterial(materialId);
      return;
    }
    
    setSelectedMaterials(prev => 
      prev.map(m => 
        m.materialId === materialId 
          ? { ...m, quantity }
          : m
      )
    );
  }, [removeMaterial]);

  // Filtros (memoizados para evitar re-cálculos desnecessários)
  const filteredGroups = useMemo(() => {
    return itemGroups.filter(group =>
      group.nome.toLowerCase().includes(groupSearchTerm.toLowerCase())
    );
  }, [itemGroups, groupSearchTerm]);

  const filteredMaterials = useMemo(() => {
    return materiais.filter(material =>
      material.descricao.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
      material.codigo.toLowerCase().includes(materialSearchTerm.toLowerCase())
    );
  }, [materiais, materialSearchTerm]);

  const availableMaterials = useMemo(() => {
    // Criar uma cópia dos arrays para evitar mutações
    const materialsFiltered = [...filteredMaterials];
    const materialsSelected = [...selectedMaterials];
    
    const result = materialsFiltered.filter(material => {
      const isSelected = materialsSelected.some(m => m.materialId === material.id);
      return !isSelected;
    });
    
    return result;
  }, [filteredMaterials, selectedMaterials]);

  if (!isOpen) return null;

  const hasAdditionalItems = selectedGroups.length > 0 || selectedMaterials.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Adicionar Novo Poste</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Coordinates Info */}
        {coordinates && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Posição: X: {coordinates.x.toFixed(2)}, Y: {coordinates.y.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('post')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'post'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Dados do Poste</span>
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
              {selectedGroups.length > 0 && (
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {selectedGroups.length}
                </span>
              )}
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
              {selectedMaterials.length > 0 && (
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {selectedMaterials.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {/* Aba Dados do Poste */}
              {activeTab === 'post' && (
                <div className="space-y-4">
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
                      disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                </div>
              )}

              {/* Aba Grupos de Itens */}
              {activeTab === 'groups' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Grupos de Itens
                    </label>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar grupos..."
                        value={groupSearchTerm}
                        onChange={(e) => setGroupSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Carregando grupos...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredGroups.map((group, index) => (
                        <div
                          key={`filtered-group-${group.id}-${index}`}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedGroups.includes(group.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{group.nome}</h4>
                              {group.descricao && (
                                <p className="text-sm text-gray-600 mt-1">{group.descricao}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {group.materiais?.length || 0} materiais
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedGroups.includes(group.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedGroups.includes(group.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredGroups.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {groupSearchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo disponível'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Aba Materiais Avulsos */}
              {activeTab === 'materials' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Materiais Selecionados
                    </label>
                      {selectedMaterials.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {selectedMaterials.map((selectedMaterial, index) => {
                          const material = materiais.find(m => m.id === selectedMaterial.materialId);
                          if (!material) {
                            return null;
                          }
                          
                          return (
                            <div key={`selected-material-${selectedMaterial.materialId}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{material.descricao}</p>
                                <p className="text-sm text-gray-600">
                                  {material.codigo} - R$ {material.precoUnit.toFixed(2)}/{material.unidade}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => updateMaterialQuantity(selectedMaterial.materialId, selectedMaterial.quantity - 1)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={selectedMaterial.quantity}
                                  onChange={(e) => updateMaterialQuantity(selectedMaterial.materialId, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateMaterialQuantity(selectedMaterial.materialId, selectedMaterial.quantity + 1)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMaterial(selectedMaterial.materialId)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-4">Nenhum material selecionado</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adicionar Materiais
                    </label>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar materiais..."
                        value={materialSearchTerm}
                        onChange={(e) => setMaterialSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {loadingMaterials ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Carregando materiais...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableMaterials.map((material, index) => {
                        return (
                          <div
                            key={`available-material-${material.id}-${index}`}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{material.descricao}</h4>
                              <p className="text-sm text-gray-600">
                                {material.codigo} - R$ {material.precoUnit.toFixed(2)}/{material.unidade}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await addMaterial(material.id);
                                } catch (error) {
                                  console.error('Erro ao adicionar material:', error);
                                }
                              }}
                              disabled={isAddingMaterial}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAddingMaterial ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                      {availableMaterials.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {materialSearchTerm ? 'Nenhum material encontrado' : 'Todos os materiais já foram selecionados'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {hasAdditionalItems && (
                    <p>
                      {selectedGroups.length > 0 && `${selectedGroups.length} grupo(s)`}
                      {selectedGroups.length > 0 && selectedMaterials.length > 0 && ' • '}
                      {selectedMaterials.length > 0 && `${selectedMaterials.length} material(is)`}
                      {' selecionado(s)'}
                    </p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || loadingPostTypes || postTypes.length === 0 || !selectedPostType || !postName.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adicionando...</span>
                      </>
                    ) : (
                      <span>Adicionar Poste</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}

export function AddPostModal(props: AddPostModalProps) {
  return (  
    <ModalErrorBoundary onError={props.onClose}>
      <AddPostModalContent {...props} />
    </ModalErrorBoundary>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { CanvasVisual } from './CanvasVisual';
import { PainelContexto } from './PainelContexto';
import { PainelConsolidado } from './PainelConsolidado';
import { Poste, TipoPoste } from '../types';
import { Table, Trash2, Loader2, X } from 'lucide-react';

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
    fetchUtilityCompanies,
    deletePostFromBudget
  } = useApp();
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<any | null>(null);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [addPostPosition, setAddPostPosition] = useState<{x: number, y: number} | null>(null);
  const [addingPost, setAddingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar detalhes do orçamento quando o currentOrcamento mudar
  useEffect(() => {
    if (currentOrcamento?.id) {
      fetchBudgetDetails(currentOrcamento.id);
    }
  }, [currentOrcamento?.id, fetchBudgetDetails]);

  // Buscar tipos de poste e concessionárias quando o componente for montado
  useEffect(() => {
    fetchPostTypes();
    fetchUtilityCompanies();
  }, [fetchPostTypes, fetchUtilityCompanies]);

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

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imagemPlanta = e.target?.result as string;
        updateOrcamento(currentOrcamento.id, { imagemPlanta });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    if (window.confirm('Tem certeza que deseja excluir a imagem? Todos os postes também serão removidos.')) {
      updateOrcamento(currentOrcamento.id, { 
        imagemPlanta: undefined,
        postes: [] // Limpa todos os postes
      });
      setSelectedPoste(null); // Limpa o poste selecionado
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

  const handleCanvasClick = (x: number, y: number) => {
    // Apenas para dados locais - no futuro, isso será usado para posicionar novos postes
    setAddPostPosition({ x, y });
    setShowAddPostModal(true);
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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Canvas Visual - Painel Superior */}
      <div className="h-2/3 bg-white border-b">
        <CanvasVisual
          orcamento={currentOrcamento}
          selectedPoste={selectedPoste}
          onPosteClick={setSelectedPoste}
          onAddPoste={addPoste}
          onUpdatePoste={updatePoste}
          onUploadImage={() => fileInputRef.current?.click()}
          onDeleteImage={handleDeleteImage}
          onDeletePoste={handleDeletePoste}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadImage}
          className="hidden"
        />
      </div>

      {/* Painéis Inferiores */}
      <div className="h-1/3 flex">
        {/* Painel de Contexto (Esquerda) */}
        <div className="w-1/3 bg-white border-r">
          <PainelContexto
            orcamento={currentOrcamento}
            selectedPoste={selectedPoste}
            selectedPostDetail={selectedPostDetail}
            onUpdatePoste={updatePoste}
          />
        </div>

        {/* Lista de Postes (Centro) */}
        <div className="w-1/3 bg-white border-r">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
              <Table className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium">Lista de Postes</h3>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {budgetDetails ? `${budgetDetails.length} postes (banco)` : `${currentOrcamento.postes.length} postes (local)`}
                </span>
                <button
                  onClick={() => {
                    setAddPostPosition({ x: 100, y: 100 }); // Posição padrão
                    setShowAddPostModal(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={loadingPostTypes}
                >
                  <span>+ Adicionar Poste</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgetDetails && budgetDetails.length > 0 ? (
                    // Dados do Supabase
                    budgetDetails.map((post) => {
                      const handleSelectPost = () => {
                        setSelectedPostDetail(post);
                        setSelectedPoste(null); // Limpar seleção local
                        console.log('Poste selecionado do Supabase:', post);
                      };

                      return (
                        <tr 
                          key={post.id}
                          className={`hover:bg-gray-50 ${selectedPostDetail?.id === post.id ? 'bg-blue-50' : ''}`}
                        >
                        <td 
                          className="px-4 py-2 whitespace-nowrap font-medium cursor-pointer" 
                          onClick={handleSelectPost}
                        >
                          {post.name}
                        </td>
                        <td 
                          className="px-4 py-2 whitespace-nowrap cursor-pointer"
                          onClick={handleSelectPost}
                        >
                          {post.post_types?.name || 'Não definido'}
                        </td>
                        <td 
                          className="px-4 py-2 whitespace-nowrap cursor-pointer"
                          onClick={handleSelectPost}
                        >
                          <div className="text-sm">
                            {post.post_item_groups.length} grupos
                            {post.post_item_groups.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {post.post_item_groups.map(group => (
                                  <div key={group.id}>{group.name}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td 
                          className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                          onClick={handleSelectPost}
                        >
                          x:{post.x_coord}, y:{post.y_coord}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePostFromDatabase(post.id, post.name);
                            }}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            disabled={deletingPost === post.id}
                          >
                            {deletingPost === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    // Dados locais (fallback)
                    currentOrcamento.postes.map((poste) => (
                    <tr 
                      key={poste.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedPoste?.id === poste.id ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          setSelectedPoste(poste);
                          setSelectedPostDetail(null); // Limpar seleção do Supabase
                        }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">{poste.nome}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{poste.tipo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          poste.concluido ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {poste.concluido ? 'Concluído' : 'Pendente'}
                        </span>
                      </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          x:{poste.x}, y:{poste.y}
                        </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoste(poste.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
              {(!budgetDetails || budgetDetails.length === 0) && currentOrcamento.postes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum poste foi adicionado ainda</p>
                  <p className="text-sm mt-1">Adicione uma imagem de planta e clique nela para criar postes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Consolidação (Direita) */}
        <div className="w-1/3 bg-white">
          <PainelConsolidado
            budgetDetails={budgetDetails}
            orcamentoNome={currentOrcamento.nome}
          />
        </div>
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
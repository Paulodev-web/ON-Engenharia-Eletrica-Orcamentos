import { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Building2, Loader2, Edit, Trash2, Copy, CheckCircle, Clock, BarChart3, TrendingUp, Search, Filter, X, Folder, FolderOpen, MoreVertical, FolderEdit, FileText, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CriarOrcamentoModal } from './modals/CriarOrcamentoModal';
import { FolderModal } from './modals/FolderModal';
import { AlertDialog } from './ui/alert-dialog';
import { useAlertDialog } from '../hooks/useAlertDialog';
import { Orcamento } from '../types';

export function Dashboard() {
  const { 
    budgets, 
    folders,
    loadingBudgets, 
    loadingFolders,
    concessionarias, 
    currentFolderId,
    setCurrentView, 
    setCurrentOrcamento, 
    fetchBudgets,
    fetchFolders,
    deleteBudget,
    duplicateBudget,
    finalizeBudget,
    addFolder,
    updateFolder,
    deleteFolder,
    moveBudgetToFolder,
    moveFolderToFolder,
    navigateToFolder,
    getFolderPath,
    isFolderDescendant,
  } = useApp();

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'edit'>('create');
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string; color?: string } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Em Andamento' | 'Finalizado'>('all');
  const [concessionariaFilter, setConcessionariaFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [draggedBudget, setDraggedBudget] = useState<Orcamento | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
  const [openBudgetMenu, setOpenBudgetMenu] = useState<string | null>(null);
  const alertDialog = useAlertDialog();

  // Buscar orçamentos e pastas na montagem do componente
  useEffect(() => {
    fetchBudgets();
    fetchFolders();
  }, [fetchBudgets, fetchFolders]);


  const getConcessionariaNome = (concessionariaId: string) => {
    const concessionaria = concessionarias.find(c => c.id === concessionariaId);
    return concessionaria?.sigla || 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleEditBudget = (budget: Orcamento) => {
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = (budget: Orcamento) => {
    alertDialog.showConfirm(
      'Excluir Orçamento',
      `Tem certeza que deseja excluir o orçamento "${budget.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await deleteBudget(budget.id);
          alertDialog.showSuccess(
            'Orçamento Excluído',
            'O orçamento foi excluído com sucesso.'
          );
        } catch (error) {
          alertDialog.showError(
            'Erro ao Excluir',
            'Não foi possível excluir o orçamento. Tente novamente.'
          );
        }
      },
      {
        type: 'destructive',
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleFinalize = async (budget: Orcamento) => {
    alertDialog.showConfirm(
      'Finalizar Orçamento',
      `Tem certeza que deseja finalizar o orçamento "${budget.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        setIsFinalizing(budget.id);
        try {
          await finalizeBudget(budget.id);
          alertDialog.showSuccess(
            'Orçamento Finalizado',
            `O orçamento "${budget.nome}" foi finalizado com sucesso.`
          );
        } catch (error) {
          console.error("Falha na operação de finalização a partir do componente.", error);
          alertDialog.showError(
            'Erro ao Finalizar',
            'Não foi possível finalizar o orçamento. Tente novamente.'
          );
        } finally {
          setIsFinalizing(null);
        }
      },
      {
        confirmText: 'Finalizar',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleDuplicateBudget = (budget: Orcamento) => {
    alertDialog.showConfirm(
      'Duplicar Orçamento',
      `Deseja duplicar o orçamento "${budget.nome}"? Uma cópia completa será criada incluindo todos os postes, grupos e materiais.`,
      async () => {
        setIsDuplicating(budget.id);
        try {
          await duplicateBudget(budget.id);
          alertDialog.showSuccess(
            'Orçamento Duplicado',
            `O orçamento "${budget.nome}" foi duplicado com sucesso. O novo orçamento foi aberto para edição.`
          );
        } catch (error) {
          console.error("Falha na duplicação do orçamento.", error);
          alertDialog.showError(
            'Erro ao Duplicar',
            'Não foi possível duplicar o orçamento. Tente novamente.'
          );
        } finally {
          setIsDuplicating(null);
        }
      },
      {
        confirmText: 'Duplicar',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleCloseBudgetModal = () => {
    setShowBudgetModal(false);
    setEditingBudget(null);
  };

  // Funções para pastas
  const handleCreateFolder = () => {
    setFolderModalMode('create');
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleOpenFolder = (folderId: string) => {
    navigateToFolder(folderId);
  };

  const handleGoBack = () => {
    const path = getFolderPath(currentFolderId);
    if (path.length > 1) {
      // Voltar para a pasta pai
      navigateToFolder(path[path.length - 2].id);
    } else {
      // Voltar para a raiz
      navigateToFolder(null);
    }
  };

  const handleEditFolder = (folderId: string, folderName: string, folderColor?: string) => {
    setFolderModalMode('edit');
    setEditingFolder({ id: folderId, name: folderName, color: folderColor });
    setShowFolderModal(true);
    setOpenFolderMenu(null);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setOpenFolderMenu(null);
    alertDialog.showConfirm(
      'Excluir Pasta',
      `Tem certeza que deseja excluir a pasta "${folderName}"? Os orçamentos dentro dela serão movidos para "Sem pasta".`,
      async () => {
        try {
          await deleteFolder(folderId);
          alertDialog.showSuccess(
            'Pasta Excluída',
            'A pasta foi excluída com sucesso.'
          );
        } catch (error) {
          alertDialog.showError(
            'Erro ao Excluir',
            'Não foi possível excluir a pasta. Tente novamente.'
          );
        }
      },
      {
        type: 'destructive',
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleSaveFolder = async (name: string, color?: string, parentId?: string | null) => {
    if (folderModalMode === 'create') {
      await addFolder(name, color, parentId);
    } else if (editingFolder) {
      await updateFolder(editingFolder.id, name, color);
    }
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setConcessionariaFilter('all');
  };

  // Filtrar orçamentos baseado nos critérios de busca
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        budget.nome.toLowerCase().includes(searchLower) ||
        budget.clientName?.toLowerCase().includes(searchLower) ||
        budget.city?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;
      const matchesConcessionaria = concessionariaFilter === 'all' || 
        budget.concessionariaId === concessionariaFilter ||
        budget.company_id === concessionariaFilter;

      return matchesSearch && matchesStatus && matchesConcessionaria;
    });
  }, [budgets, searchTerm, statusFilter, concessionariaFilter]);

  // Filtrar pastas e orçamentos do nível atual
  const currentLevelFolders = useMemo(() => {
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const currentLevelBudgets = useMemo(() => {
    return filteredBudgets.filter(budget => budget.folderId === currentFolderId);
  }, [filteredBudgets, currentFolderId]);

  // Organizar orçamentos por pasta (mantido para drag & drop)
  const budgetsByFolder = useMemo(() => {
    const organized: Record<string, Orcamento[]> = {
      'no-folder': [],
    };

    folders.forEach(folder => {
      organized[folder.id] = [];
    });

    filteredBudgets.forEach(budget => {
      if (budget.folderId && organized[budget.folderId]) {
        organized[budget.folderId].push(budget);
      } else {
        organized['no-folder'].push(budget);
      }
    });

    return organized;
  }, [filteredBudgets, folders]);

  // Obter caminho de navegação (breadcrumb)
  const folderPath = useMemo(() => {
    return getFolderPath(currentFolderId);
  }, [currentFolderId, getFolderPath]);

  // Calcular estatísticas dos orçamentos filtrados
  const getBudgetStats = () => {
    const total = filteredBudgets.length;
    const finalizados = filteredBudgets.filter(b => b.status === 'Finalizado').length;
    const emAndamento = filteredBudgets.filter(b => b.status === 'Em Andamento').length;
    const percentualFinalizacao = total > 0 ? Math.round((finalizados / total) * 100) : 0;

    return {
      total,
      finalizados,
      emAndamento,
      percentualFinalizacao
    };
  };

  const stats = getBudgetStats();
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || concessionariaFilter !== 'all';

  // Drag and Drop handlers - SIMPLIFICADO
  const handleBudgetDragStart = (e: React.DragEvent, budget: Orcamento) => {
    e.stopPropagation();
    setDraggedBudget(budget);
  };

  const handleBudgetDragEnd = () => {
    setDraggedBudget(null);
    setDropTargetFolder(null);
    setIsDraggingOver(false);
  };

  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    e.stopPropagation();
    setDraggedFolder(folderId);
  };

  const handleFolderDragEnd = () => {
    setDraggedFolder(null);
    setDropTargetFolder(null);
    setIsDraggingOver(false);
  };

  // Verificar se o drop é válido
  const isValidDropTarget = (targetFolderId: string | null): boolean => {
    if (draggedFolder) {
      // Não pode soltar pasta nela mesma
      if (draggedFolder === targetFolderId) return false;
      
      // Não pode soltar pasta dentro de suas subpastas
      if (targetFolderId && isFolderDescendant(targetFolderId, draggedFolder)) return false;
      
      // Verificar se já está na mesma pasta
      const currentFolder = folders.find(f => f.id === draggedFolder);
      if (currentFolder?.parentId === targetFolderId) return false;
    }
    
    if (draggedBudget) {
      // Verificar se orçamento já está na pasta
      if (draggedBudget.folderId === targetFolderId) return false;
    }
    
    return true;
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isValidDropTarget(targetFolderId)) {
      setDropTargetFolder(null);
      setIsDraggingOver(false);
      return;
    }
    
    setDropTargetFolder(targetFolderId);
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Só limpar se realmente saiu do elemento (não foi para um filho)
    const relatedTarget = e.relatedTarget as Node;
    if (relatedTarget && e.currentTarget instanceof Node && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    
    setIsDraggingOver(false);
    // Pequeno delay para evitar flickering
    setTimeout(() => {
      if (!isDraggingOver) {
        setDropTargetFolder(null);
      }
    }, 50);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isValidDropTarget(targetFolderId)) {
      setDraggedBudget(null);
      setDraggedFolder(null);
      setDropTargetFolder(null);
      setIsDraggingOver(false);
      return;
    }
    
    try {
      // Mover orçamento
      if (draggedBudget) {
        await moveBudgetToFolder(draggedBudget.id, targetFolderId);
        const destino = targetFolderId 
          ? folders.find(f => f.id === targetFolderId)?.name || 'pasta' 
          : 'raiz';
        alertDialog.showSuccess(
          'Orçamento Movido',
          `"${draggedBudget.nome}" foi movido para ${destino}.`
        );
      }
      
      // Mover pasta
      if (draggedFolder) {
        await moveFolderToFolder(draggedFolder, targetFolderId);
        const folderName = folders.find(f => f.id === draggedFolder)?.name || 'pasta';
        const destino = targetFolderId 
          ? folders.find(f => f.id === targetFolderId)?.name || 'pasta' 
          : 'raiz';
        alertDialog.showSuccess(
          'Pasta Movida',
          `"${folderName}" foi movida para ${destino}.`
        );
      }
    } catch (error: any) {
      console.error('Erro ao mover:', error);
      alertDialog.showError(
        'Erro ao Mover',
        error.message || 'Não foi possível realizar a operação.'
      );
    } finally {
      setDraggedBudget(null);
      setDraggedFolder(null);
      setDropTargetFolder(null);
      setIsDraggingOver(false);
    }
  };

  // Função para remover item da pasta (mover para raiz)
  const handleRemoveFromFolder = async (itemId: string, itemType: 'budget' | 'folder', itemName: string) => {
    setOpenBudgetMenu(null);
    setOpenFolderMenu(null);
    
    alertDialog.showConfirm(
      'Remover da Pasta',
      `Deseja mover "${itemName}" para a raiz (remover da pasta atual)?`,
      async () => {
        try {
          if (itemType === 'budget') {
            await moveBudgetToFolder(itemId, null);
          } else {
            await moveFolderToFolder(itemId, null);
          }
          alertDialog.showSuccess(
            'Item Movido',
            `"${itemName}" foi movido para a raiz.`
          );
        } catch (error: any) {
          alertDialog.showError(
            'Erro ao Mover',
            'Não foi possível mover o item.'
          );
        }
      },
      {
        confirmText: 'Mover para Raiz',
        cancelText: 'Cancelar'
      }
    );
  };

  // Componente de Card de Orçamento - Design Melhorado
  const BudgetCard = ({ budget }: { budget: Orcamento }) => {
    const isDragging = draggedBudget?.id === budget.id;
    const [isClick, setIsClick] = useState(true);
    
    return (
      <div
        draggable={true}
        onMouseDown={(e) => {
          // Prevenir seleção de texto
          if (e.button === 0) { // Botão esquerdo
            setIsClick(true);
          }
        }}
        onDragStart={(e) => {
          setIsClick(false);
          handleBudgetDragStart(e, budget);
        }}
        onDragEnd={handleBudgetDragEnd}
        onClick={() => {
          // Só abre se for click (não foi drag)
          if (isClick && !isDragging) {
            setCurrentOrcamento(budget);
            setCurrentView('orcamento');
          }
          setIsClick(true);
        }}
        className={`group relative bg-white rounded-lg border transition-all duration-200 ${
          isDragging
            ? 'scale-95 border-gray-400 shadow-xl ring-2 ring-gray-300 cursor-grabbing' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-grab hover:cursor-grab active:cursor-grabbing'
        }`}
        style={{ userSelect: 'none' }}
      >
      <div className="p-4">
        {/* Cabeçalho com Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
              {budget.nome}
            </h3>
            {budget.clientName && (
              <p className="text-sm text-gray-600 truncate">
                {budget.clientName}
              </p>
            )}
          </div>
          {budget.status === 'Finalizado' ? (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Finalizado
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="h-3 w-3 mr-1" />
              Em Andamento
            </span>
          )}
        </div>

        {/* Informações */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center">
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            <span>{getConcessionariaNome(budget.concessionariaId)}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <span>{formatDate(budget.dataModificacao)}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end space-x-1 relative">
          {budget.status !== 'Finalizado' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditBudget(budget);
                }}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateBudget(budget);
                }}
                disabled={isDuplicating === budget.id}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Duplicar"
              >
                <Copy className="h-4 w-4" />
              </button>
              
              {/* Botão de menu com mais opções */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenBudgetMenu(openBudgetMenu === budget.id ? null : budget.id);
                }}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Mais opções"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              
              {/* Dropdown Menu */}
              {openBudgetMenu === budget.id && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBudgetMenu(null);
                    }}
                  ></div>
                  
                  <div className="absolute right-0 top-10 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-30 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinalize(budget);
                        setOpenBudgetMenu(null);
                      }}
                      disabled={isFinalizing === budget.id}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{isFinalizing === budget.id ? 'Finalizando...' : 'Finalizar Orçamento'}</span>
                    </button>
                    
                    {budget.folderId && (
                      <>
                        <div className="border-t border-gray-100"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromFolder(budget.id, 'budget', budget.nome);
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <FolderOpen className="h-4 w-4" />
                          <span>Mover para Raiz</span>
                        </button>
                      </>
                    )}
                    
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBudget(budget);
                        setOpenBudgetMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateBudget(budget);
                }}
                disabled={isDuplicating === budget.id}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Duplicar"
              >
                <Copy className="h-4 w-4" />
              </button>
              
              {/* Botão de menu para orçamentos finalizados */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenBudgetMenu(openBudgetMenu === budget.id ? null : budget.id);
                }}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Mais opções"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              
              {/* Dropdown Menu */}
              {openBudgetMenu === budget.id && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBudgetMenu(null);
                    }}
                  ></div>
                  
                  <div className="absolute right-0 top-10 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-30 overflow-hidden">
                    {budget.folderId && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromFolder(budget.id, 'budget', budget.nome);
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <FolderOpen className="h-4 w-4" />
                          <span>Mover para Raiz</span>
                        </button>
                        <div className="border-t border-gray-100"></div>
                      </>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBudget(budget);
                        setOpenBudgetMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Indicador visual de drag */}
      {isDragging && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-10 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium">
            Arrastando...
          </div>
        </div>
      )}
    </div>
    );
  };

  // Componente de Pasta - Design Melhorado
  const FolderCard = ({ folderId, folderName, folderColor }: { folderId: string; folderName: string; folderColor?: string }) => {
    const folder = folders.find(f => f.id === folderId);
    const subfolders = folders.filter(f => f.parentId === folderId);
    const budgetsInFolder = budgetsByFolder[folderId] || [];
    const totalItems = subfolders.length + budgetsInFolder.length;
    const isDropTarget = dropTargetFolder === folderId && isDraggingOver;
    const isDragging = draggedFolder === folderId;
    const isValidTarget = isValidDropTarget(folderId);
    const [isDblClick, setIsDblClick] = useState(true);

    return (
      <div
        draggable={true}
        onMouseDown={(e) => {
          // Prevenir seleção de texto
          if (e.button === 0) { // Botão esquerdo
            setIsDblClick(true);
          }
        }}
        onDragStart={(e) => {
          setIsDblClick(false);
          handleFolderDragStart(e, folderId);
        }}
        onDragEnd={handleFolderDragEnd}
        onDragOver={(e) => handleDragOver(e, folderId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folderId)}
        onDoubleClick={() => {
          // Só abre se for double click (não foi drag)
          if (isDblClick && !isDragging) {
            handleOpenFolder(folderId);
          }
          setIsDblClick(true);
        }}
        className={`relative bg-white rounded-lg border transition-all duration-200 ${
          isDragging
            ? 'scale-95 border-gray-400 shadow-xl ring-2 ring-gray-300 cursor-grabbing'
            : isDropTarget && isValidTarget
            ? 'border-2 border-blue-500 bg-blue-50 shadow-lg cursor-grab hover:cursor-grab transform scale-105' 
            : isDropTarget && !isValidTarget
            ? 'border-2 border-red-500 bg-red-50 cursor-not-allowed'
            : 'border border-gray-200 hover:border-gray-300 hover:shadow-md cursor-grab hover:cursor-grab'
        }`}
        style={{ userSelect: 'none' }}
      >
        {/* Cabeçalho da Pasta */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3 flex-1 pointer-events-none">
            <Folder 
              className="h-6 w-6 flex-shrink-0" 
              style={{ color: folderColor || '#6B7280' }} 
            />
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {folderName}
              </h3>
              <p className="text-sm text-gray-500">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                {subfolders.length > 0 && ` (${subfolders.length} ${subfolders.length === 1 ? 'pasta' : 'pastas'})`}
              </p>
            </div>
          </div>

          {/* Menu de Ações - Atualizado com opção de mover */}
          <div className="flex items-center space-x-2 relative pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenu(openFolderMenu === folderId ? null : folderId);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {/* Dropdown Menu */}
            {openFolderMenu === folderId && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFolderMenu(null);
                  }}
                ></div>
                
                <div className="absolute right-0 top-10 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-30 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFolder(folderId);
                      setOpenFolderMenu(null);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Abrir Pasta</span>
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFolder(folderId, folderName, folderColor);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FolderEdit className="h-4 w-4" />
                    <span>Renomear</span>
                  </button>
                  
                  {folder?.parentId && (
                    <>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromFolder(folderId, 'folder', folderName);
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <Home className="h-4 w-4" />
                        <span>Mover para Raiz</span>
                      </button>
                    </>
                  )}
                  
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folderId, folderName);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Indicador de Arrasto */}
        {isDragging && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-10 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium">
              Arrastando pasta...
            </div>
          </div>
        )}

        {/* Indicador de Drop Válido */}
        {isDropTarget && isValidTarget && !isDragging && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none flex items-center justify-center rounded-lg animate-pulse">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center space-x-2">
              {draggedFolder ? (
                <>
                  <Folder className="h-4 w-4" />
                  <span>Soltar pasta aqui</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Soltar orçamento aqui</span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Indicador de Drop Inválido */}
        {isDropTarget && !isValidTarget && !isDragging && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-10 pointer-events-none flex items-center justify-center rounded-lg">
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center space-x-2">
              <X className="h-4 w-4" />
              <span>Operação inválida</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Orçamentos</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus projetos</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateFolder}
            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Folder className="h-4 w-4" />
            <span>Nova Pasta</span>
          </button>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Estatísticas - Design Neutro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-amber-600">{stats.emAndamento}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Finalizados</p>
              <p className="text-2xl font-bold text-green-600">{stats.finalizados}</p>
            </div>
            <div className="p-2.5 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-gray-700">{stats.percentualFinalizacao}%</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Barra de Busca */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome do projeto, cliente ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Botão de Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters 
                ? 'bg-gray-900 text-white hover:bg-gray-800' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-white text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                {(statusFilter !== 'all' ? 1 : 0) + (concessionariaFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Painel de Filtros Expandido */}
        {showFilters && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Status do Projeto
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Em Andamento' | 'Finalizado')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>

              {/* Concessionária */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Concessionária
                </label>
                <select
                  value={concessionariaFilter}
                  onChange={(e) => setConcessionariaFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                >
                  <option value="all">Todas as Concessionárias</option>
                  {concessionarias.map((conc) => (
                    <option key={conc.id} value={conc.id}>
                      {conc.sigla} - {conc.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão Limpar */}
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contador de Resultados */}
        {hasActiveFilters && (
          <div className="pt-3 mt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">{filteredBudgets.length}</span> de{' '}
              <span className="font-semibold text-gray-900">{budgets.length}</span> orçamentos
            </p>
          </div>
        )}
      </div>

      {/* Breadcrumbs e Navegação - COM DROP ZONES */}
      {(currentFolderId || folderPath.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              {/* Botão Voltar */}
              <button
                onClick={handleGoBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {/* Breadcrumbs com Drop Zones */}
              <div className="flex items-center space-x-2 text-sm flex-1">
                {/* Início - Drop Zone para Raiz */}
                <div
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                  className={`rounded-lg transition-all duration-200 ${
                    dropTargetFolder === null && isDraggingOver && isValidDropTarget(null)
                      ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => navigateToFolder(null)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      dropTargetFolder === null && isDraggingOver && isValidDropTarget(null)
                        ? 'text-blue-700 font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    <span>Início</span>
                  </button>
                </div>
                
                {/* Pastas no Caminho - Cada uma é um Drop Zone */}
                {folderPath.map((folder: any, index: number) => (
                  <div key={folder.id} className="flex items-center space-x-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <div
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder.id)}
                      className={`rounded-lg transition-all duration-200 ${
                        dropTargetFolder === folder.id && isDraggingOver && isValidDropTarget(folder.id)
                          ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                          : ''
                      }`}
                    >
                      <button
                        onClick={() => navigateToFolder(folder.id)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                          dropTargetFolder === folder.id && isDraggingOver && isValidDropTarget(folder.id)
                            ? 'text-blue-700 font-bold'
                            : index === folderPath.length - 1
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Folder className="h-4 w-4" style={{ color: folder.color || '#6B7280' }} />
                        <span>{folder.name}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Indicador de Drag Ativo */}
              {(draggedBudget || draggedFolder) && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                  <span>💡 Arraste para os breadcrumbs para mover</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone "Mover para Nível Superior" - Visível quando está arrastando dentro de pasta */}
      {currentFolderId && (draggedBudget || draggedFolder) && (
        <div
          onDragOver={(e) => {
            const parentId = folderPath.length > 1 
              ? folderPath[folderPath.length - 2].id 
              : null;
            handleDragOver(e, parentId);
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            const parentId = folderPath.length > 1 
              ? folderPath[folderPath.length - 2].id 
              : null;
            handleDrop(e, parentId);
          }}
          className={`relative bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
            dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
              ? 'border-blue-500 bg-blue-100 scale-105 shadow-lg'
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <div className={`p-3 rounded-full transition-all duration-200 ${
              dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
                ? 'bg-blue-500 animate-bounce'
                : 'bg-blue-200'
            }`}>
              <ArrowLeft className={`h-6 w-6 ${
                dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
                  ? 'text-white'
                  : 'text-blue-600'
              }`} />
            </div>
            <div className="text-center">
              <h3 className={`text-lg font-bold mb-1 transition-colors ${
                dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
                  ? 'text-blue-700'
                  : 'text-blue-600'
              }`}>
                {dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
                  ? '🎯 Solte aqui!'
                  : '⬆️ Mover para Nível Superior'}
              </h3>
              <p className="text-sm text-blue-600">
                {folderPath.length > 1 
                  ? `Voltar para "${folderPath[folderPath.length - 2].name}"`
                  : 'Voltar para a raiz'}
              </p>
            </div>
            <div className={`p-3 rounded-full transition-all duration-200 ${
              dropTargetFolder === (folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null) && isDraggingOver
                ? 'bg-blue-500 animate-bounce'
                : 'bg-blue-200'
            }`}>
              {folderPath.length > 1 ? (
                <Folder className={`h-6 w-6 ${
                  dropTargetFolder === folderPath[folderPath.length - 2].id && isDraggingOver
                    ? 'text-white'
                    : 'text-blue-600'
                }`} />
              ) : (
                <Home className={`h-6 w-6 ${
                  dropTargetFolder === null && isDraggingOver
                    ? 'text-white'
                    : 'text-blue-600'
                }`} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      {loadingBudgets || loadingFolders ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Carregando...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pastas do Nível Atual */}
          {currentLevelFolders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentLevelFolders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folderId={folder.id}
                  folderName={folder.name}
                  folderColor={folder.color}
                />
              ))}
            </div>
          )}

          {/* Orçamentos do Nível Atual */}
          {currentLevelBudgets.length > 0 && (
            <div
              onDragOver={(e) => handleDragOver(e, currentFolderId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, currentFolderId)}
              className={`relative transition-all duration-200 rounded-lg ${
                dropTargetFolder === currentFolderId && isDraggingOver && isValidDropTarget(currentFolderId)
                  ? 'bg-blue-50 border-2 border-blue-500 p-4 shadow-lg' 
                  : ''
              }`}
            >
              <div className={currentLevelFolders.length > 0 ? "mt-6" : ""}>
                {currentLevelFolders.length > 0 && (
                  <div className="flex items-center space-x-2 mb-4">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-900">Orçamentos</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {currentLevelBudgets.map(budget => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              </div>

              {dropTargetFolder === currentFolderId && isDraggingOver && isValidDropTarget(currentFolderId) && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none flex items-center justify-center rounded-lg animate-pulse">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center space-x-2">
                    {draggedFolder ? (
                      <>
                        <Folder className="h-4 w-4" />
                        <span>Soltar pasta aqui</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>Soltar orçamento aqui</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensagem quando não há conteúdo no nível atual */}
          {currentLevelFolders.length === 0 && currentLevelBudgets.length === 0 && (
            <div 
              onDragOver={(e) => handleDragOver(e, currentFolderId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, currentFolderId)}
              className={`relative text-center py-12 bg-white rounded-lg transition-all duration-200 ${
                dropTargetFolder === currentFolderId && isDraggingOver && isValidDropTarget(currentFolderId)
                  ? 'border-2 border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-2 border-dashed border-gray-200'
              }`}
            >
              {dropTargetFolder === currentFolderId && isDraggingOver && isValidDropTarget(currentFolderId) ? (
                <>
                  <div className="animate-bounce">
                    {draggedFolder ? (
                      <Folder className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    ) : (
                      <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-blue-600 mb-2">
                    Solte aqui!
                  </h3>
                  <p className="text-sm text-blue-700 font-medium">
                    {draggedFolder ? 'Mover pasta para este local' : 'Adicionar orçamento nesta pasta'}
                  </p>
                </>
              ) : (
                <>
                  <Folder className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {currentFolderId ? 'Pasta vazia' : 'Nenhum conteúdo'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {currentFolderId 
                      ? 'Crie subpastas, adicione orçamentos ou arraste itens para cá' 
                      : 'Comece criando uma pasta ou orçamento'}
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={handleCreateFolder}
                      className="inline-flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Folder className="h-4 w-4" />
                      <span>Nova Pasta</span>
                    </button>
                    <button
                      onClick={() => setShowBudgetModal(true)}
                      className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Novo Orçamento</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mensagem quando não há resultados com filtros */}
          {budgets.length > 0 && filteredBudgets.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum resultado encontrado</h3>
              <p className="text-sm text-gray-500 mb-4">Tente ajustar seus filtros</p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <X className="h-4 w-4" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {showBudgetModal && (
        <CriarOrcamentoModal
          isOpen={showBudgetModal}
          onClose={handleCloseBudgetModal}
          editingBudget={editingBudget}
        />
      )}

      {showFolderModal && (
        <FolderModal
          isOpen={showFolderModal}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
          }}
          onSave={handleSaveFolder}
          initialName={editingFolder?.name || ''}
          initialColor={editingFolder?.color}
          mode={folderModalMode}
        />
      )}

      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}

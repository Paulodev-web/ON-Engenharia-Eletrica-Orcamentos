import { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Building2, Loader2, Edit, Trash2, Copy, CheckCircle, Clock, BarChart3, TrendingUp, Search, Filter, X, Folder, FolderOpen, MoreVertical, FolderEdit, FileText } from 'lucide-react';
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
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [draggedBudget, setDraggedBudget] = useState<Orcamento | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
  const alertDialog = useAlertDialog();

  // Buscar orçamentos e pastas na montagem do componente
  useEffect(() => {
    fetchBudgets();
    fetchFolders();
  }, [fetchBudgets, fetchFolders]);

  const handleAbrirOrcamento = (orcamentoId: string) => {
    const orcamento = budgets.find(o => o.id === orcamentoId);
    if (orcamento) {
      setCurrentOrcamento(orcamento);
      setCurrentView('orcamento');
    }
  };

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

  const handleSaveFolder = async (name: string, color?: string) => {
    if (folderModalMode === 'create') {
      await addFolder(name, color);
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

  // Organizar orçamentos por pasta
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

  // Drag and Drop handlers
  const handleDragStart = (budget: Orcamento) => {
    setDraggedBudget(budget);
  };

  const handleDragEnd = () => {
    setDraggedBudget(null);
    setDropTargetFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDropTargetFolder(folderId);
  };

  const handleDragLeave = () => {
    setDropTargetFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    
    if (draggedBudget && draggedBudget.folderId !== folderId) {
      try {
        await moveBudgetToFolder(draggedBudget.id, folderId);
      } catch (error) {
        alertDialog.showError(
          'Erro ao Mover',
          'Não foi possível mover o orçamento. Tente novamente.'
        );
      }
    }
    
    setDraggedBudget(null);
    setDropTargetFolder(null);
  };

  // Componente de Card de Orçamento - Design Neutro e Limpo
  const BudgetCard = ({ budget }: { budget: Orcamento }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(budget)}
      onDragEnd={handleDragEnd}
      onClick={() => handleAbrirOrcamento(budget.id)}
      className={`group relative bg-white rounded-lg border transition-all duration-200 cursor-move ${
        draggedBudget?.id === budget.id 
          ? 'opacity-50 scale-95 border-gray-400 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
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
        <div className="flex items-center justify-end space-x-1">
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFinalize(budget);
                }}
                disabled={isFinalizing === budget.id}
                className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Finalizar"
              >
                {isFinalizing === budget.id ? 'Finalizando...' : 'Finalizar'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBudget(budget);
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBudget(budget);
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de Pasta - Design Neutro e Integrado
  const FolderCard = ({ folderId, folderName, folderColor }: { folderId: string; folderName: string; folderColor?: string }) => {
    const budgetsInFolder = budgetsByFolder[folderId] || [];
    const isExpanded = expandedFolderId === folderId;
    const isDropTarget = dropTargetFolder === folderId;

    return (
      <div className="mb-4">
        <div
          onDragOver={(e) => handleDragOver(e, folderId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folderId)}
          className={`bg-white rounded-lg border transition-all ${
            isDropTarget 
              ? 'border-2 border-gray-400 bg-gray-50 shadow-md' 
              : 'border border-gray-200 hover:border-gray-300'
          }`}
        >
          {/* Cabeçalho da Pasta */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setExpandedFolderId(isExpanded ? null : folderId)}
          >
            <div className="flex items-center space-x-3 flex-1">
              {isExpanded ? (
                <FolderOpen 
                  className="h-5 w-5 flex-shrink-0" 
                  style={{ color: folderColor || '#6B7280' }} 
                />
              ) : (
                <Folder 
                  className="h-5 w-5 flex-shrink-0" 
                  style={{ color: folderColor || '#6B7280' }} 
                />
              )}
              
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {folderName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {budgetsInFolder.length} {budgetsInFolder.length === 1 ? 'orçamento' : 'orçamentos'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu de Ações */}
            <div className="flex items-center space-x-2 relative">
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
                  
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-30 overflow-hidden">
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

          {/* Conteúdo da Pasta (Expandido) */}
          {isExpanded && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {budgetsInFolder.length > 0 ? (
                <div className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {budgetsInFolder.map(budget => (
                      <BudgetCard key={budget.id} budget={budget} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50 mt-4">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum orçamento</p>
                  <p className="text-xs text-gray-400 mt-1">Arraste orçamentos para cá</p>
                </div>
              )}
            </div>
          )}

          {/* Indicador de Drop Target */}
          {isDropTarget && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-5 pointer-events-none flex items-center justify-center border-2 border-gray-400 rounded-lg">
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Soltar aqui
              </div>
            </div>
          )}
        </div>
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
            {/* Pastas */}
            {folders.map(folder => (
              <FolderCard
                key={folder.id}
                folderId={folder.id}
                folderName={folder.name}
                folderColor={folder.color}
              />
            ))}

          {/* Orçamentos Sem Pasta */}
          {budgetsByFolder['no-folder'].length > 0 && (
            <div
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
              className={`relative bg-white border rounded-lg transition-all ${
                dropTargetFolder === null && draggedBudget
                  ? 'border-gray-400 border-2 bg-gray-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Sem Pasta</h3>
                    <p className="text-xs text-gray-500">
                      {budgetsByFolder['no-folder'].length} {budgetsByFolder['no-folder'].length === 1 ? 'orçamento' : 'orçamentos'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {budgetsByFolder['no-folder'].map(budget => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              </div>

              {dropTargetFolder === null && draggedBudget && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-5 pointer-events-none flex items-center justify-center border-2 border-gray-400 rounded-lg">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Soltar aqui
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensagem quando não há orçamentos */}
          {budgets.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum orçamento ainda</h3>
              <p className="text-sm text-gray-500 mb-4">Comece criando seu primeiro orçamento</p>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Orçamento</span>
              </button>
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

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

  // Componente de Card de Orçamento
  const BudgetCard = ({ budget }: { budget: Orcamento }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(budget)}
      onDragEnd={handleDragEnd}
      onClick={() => handleAbrirOrcamento(budget.id)}
      className={`bg-white rounded-lg border-2 p-4 cursor-move hover:shadow-lg transition-all ${
        draggedBudget?.id === budget.id ? 'opacity-50 border-blue-400' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {budget.nome}
          </h3>
          {budget.clientName && (
            <p className="text-sm text-gray-600 truncate">
              Cliente: {budget.clientName}
            </p>
          )}
          {budget.city && (
            <p className="text-sm text-gray-600 truncate">
              Cidade: {budget.city}
            </p>
          )}
        </div>
        {budget.status === 'Finalizado' ? (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex-shrink-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalizado
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex-shrink-0">
            <Clock className="h-3 w-3 mr-1" />
            Em Andamento
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <div className="flex items-center">
          <Building2 className="h-4 w-4 mr-1" />
          <span>{getConcessionariaNome(budget.concessionariaId)}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formatDate(budget.dataModificacao)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
        {budget.status !== 'Finalizado' ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditBudget(budget);
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
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
              className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
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
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Finalizar"
            >
              {isFinalizing === budget.id ? 'Finalizando...' : 'Finalizar'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBudget(budget);
              }}
              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
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
              className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
              title="Duplicar"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBudget(budget);
              }}
              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Componente de Pasta
  const FolderCard = ({ folderId, folderName, folderColor }: { folderId: string; folderName: string; folderColor?: string }) => {
    const budgetsInFolder = budgetsByFolder[folderId] || [];
    const isExpanded = expandedFolderId === folderId;
    const isDropTarget = dropTargetFolder === folderId;

    return (
      <div className="mb-6">
        <div
          onDragOver={(e) => handleDragOver(e, folderId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folderId)}
          className={`bg-white rounded-lg border-2 transition-all ${
            isDropTarget ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200'
          }`}
        >
          {/* Cabeçalho da Pasta */}
          <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedFolderId(isExpanded ? null : folderId)}>
            <div className="flex items-center space-x-3">
              {isExpanded ? (
                <FolderOpen className="h-6 w-6" style={{ color: folderColor }} fill={folderColor} />
              ) : (
                <Folder className="h-6 w-6" style={{ color: folderColor }} fill={folderColor} />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{folderName}</h3>
                <p className="text-sm text-gray-600">
                  {budgetsInFolder.length} {budgetsInFolder.length === 1 ? 'orçamento' : 'orçamentos'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFolderMenu(openFolderMenu === folderId ? null : folderId);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                
                {/* Menu da Pasta */}
                {openFolderMenu === folderId && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFolder(folderId, folderName, folderColor);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <FolderEdit className="h-4 w-4" />
                      <span>Renomear</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folderId, folderName);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo da Pasta (Expandido) */}
          {isExpanded && budgetsInFolder.length > 0 && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgetsInFolder.map(budget => (
                  <BudgetCard key={budget.id} budget={budget} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Meus Orçamentos</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateFolder}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Folder className="h-5 w-5" />
            <span>Nova Pasta</span>
          </button>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Orçamentos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Andamento</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.emAndamento}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Finalizados</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.finalizados}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.percentualFinalizacao}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome do projeto, cliente ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {(statusFilter !== 'all' ? 1 : 0) + (concessionariaFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status do Projeto
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Em Andamento' | 'Finalizado')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concessionária
              </label>
              <select
                value={concessionariaFilter}
                onChange={(e) => setConcessionariaFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                {concessionarias.map((conc) => (
                  <option key={conc.id} value={conc.id}>
                    {conc.sigla} - {conc.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">{filteredBudgets.length}</span> de{' '}
              <span className="font-semibold text-gray-900">{budgets.length}</span> orçamentos
            </p>
          </div>
        )}
      </div>

      {/* Conteúdo Principal - Pastas e Orçamentos */}
      <div className="flex-1 overflow-auto">
        {loadingBudgets || loadingFolders ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-500">Carregando...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
              <div>
                <div
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                  className={`bg-white rounded-lg border-2 p-4 transition-all ${
                    dropTargetFolder === null ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <FileText className="h-6 w-6 text-gray-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Sem pasta</h3>
                      <p className="text-sm text-gray-600">
                        {budgetsByFolder['no-folder'].length} {budgetsByFolder['no-folder'].length === 1 ? 'orçamento' : 'orçamentos'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgetsByFolder['no-folder'].map(budget => (
                      <BudgetCard key={budget.id} budget={budget} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem quando não há orçamentos */}
            {budgets.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum orçamento encontrado.</p>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Criar seu primeiro orçamento
                </button>
              </div>
            )}

            {/* Mensagem quando não há resultados com os filtros */}
            {budgets.length > 0 && filteredBudgets.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">Nenhum orçamento encontrado com os filtros aplicados.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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

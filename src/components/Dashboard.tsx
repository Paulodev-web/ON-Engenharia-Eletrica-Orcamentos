import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Building2, Loader2, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CriarOrcamentoModal } from './modals/CriarOrcamentoModal';
import { AlertDialog } from './ui/alert-dialog';
import { Orcamento } from '../types';

export function Dashboard() {
  const { 
    budgets, 
    loadingBudgets, 
    concessionarias, 
    setCurrentView, 
    setCurrentOrcamento, 
    fetchBudgets,
    deleteBudget
  } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Orcamento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Buscar orçamentos na montagem do componente
  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

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
    setShowModal(true);
  };

  const handleDeleteBudget = (budget: Orcamento) => {
    setDeletingBudget(budget);
  };

  const confirmDelete = async () => {
    if (!deletingBudget) return;

    setIsDeleting(true);
    try {
      await deleteBudget(deletingBudget.id);
      setDeletingBudget(null);
    } catch (error) {
      alert('Erro ao excluir orçamento. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Meus Orçamentos</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome do Projeto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Concessionária
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Modificação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingBudgets ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-500">Carregando orçamentos...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                budgets.map((orcamento) => (
                  <tr key={orcamento.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleAbrirOrcamento(orcamento.id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {orcamento.nome}
                      </div>
                      {orcamento.clientName && (
                        <div className="text-sm text-gray-500">
                          Cliente: {orcamento.clientName}
                        </div>
                      )}
                      {orcamento.city && (
                        <div className="text-sm text-gray-500">
                          Cidade: {orcamento.city}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {getConcessionariaNome(orcamento.concessionariaId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(orcamento.dataModificacao)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        orcamento.status === 'Finalizado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {orcamento.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirOrcamento(orcamento.id);
                          }}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditBudget(orcamento);
                          }}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Editar orçamento"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBudget(orcamento);
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Excluir orçamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loadingBudgets && budgets.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Nenhum orçamento encontrado.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Criar seu primeiro orçamento
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CriarOrcamentoModal
          isOpen={showModal}
          onClose={handleCloseModal}
          editingBudget={editingBudget}
        />
      )}

      <AlertDialog
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o orçamento "${deletingBudget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        confirmVariant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
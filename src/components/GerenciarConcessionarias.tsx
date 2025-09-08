import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Building2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Concessionaria } from '../types';

export function GerenciarConcessionarias() {
  const { 
    utilityCompanies, 
    loadingCompanies, 
    fetchUtilityCompanies, 
    addUtilityCompany, 
    updateUtilityCompany, 
    deleteUtilityCompany 
  } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Concessionaria | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Buscar concessionárias quando o componente for montado
  useEffect(() => {
    fetchUtilityCompanies();
  }, [fetchUtilityCompanies]);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
  };

  const handleEdit = (company: Concessionaria) => {
    if (operationLoading) return;
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (operationLoading) return;
    
    if (confirm(`Tem certeza que deseja excluir a concessionária "${name}"?`)) {
      setDeletingId(id);
      try {
        await deleteUtilityCompany(id);
        showMessage('success', 'Concessionária excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir concessionária:', error);
        showMessage('error', 'Erro ao excluir concessionária. Tente novamente.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleCloseModal = () => {
    if (operationLoading) return;
    setShowModal(false);
    setEditingCompany(null);
  };

  const handleRefresh = async () => {
    if (operationLoading) return;
    try {
      await fetchUtilityCompanies();
      showMessage('success', 'Lista de concessionárias atualizada!');
    } catch (error) {
      showMessage('error', 'Erro ao atualizar lista de concessionárias.');
    }
  };

  const handleSaveCompany = async (companyData: { name: string }) => {
    setOperationLoading(true);
    try {
      if (editingCompany) {
        await updateUtilityCompany(editingCompany.id, companyData);
        showMessage('success', 'Concessionária atualizada com sucesso!');
      } else {
        await addUtilityCompany(companyData);
        showMessage('success', 'Concessionária adicionada com sucesso!');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar concessionária:', error);
      showMessage('error', 'Erro ao salvar concessionária. Tente novamente.');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Concessionárias</h2>
          <p className="text-gray-600">Cadastre e gerencie as concessionárias do sistema</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh}
            disabled={loadingCompanies || operationLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingCompanies ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={operationLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            <span>Nova Concessionária</span>
          </button>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <p>{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Loading State */}
        {loadingCompanies ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-500">Carregando concessionárias...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome da Concessionária
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {utilityCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {company.nome}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(company)}
                          disabled={operationLoading || deletingId === company.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Editar concessionária"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id, company.nome)}
                          disabled={operationLoading || deletingId === company.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir concessionária"
                        >
                          {deletingId === company.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {utilityCompanies.length === 0 && !loadingCompanies && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhuma concessionária cadastrada.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Cadastrar primeira concessionária
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <CompanyModal
          company={editingCompany}
          onClose={handleCloseModal}
          onSave={handleSaveCompany}
          loading={operationLoading}
        />
      )}
    </div>
  );
}

interface CompanyModalProps {
  company: Concessionaria | null;
  onClose: () => void;
  onSave: (company: { name: string }) => Promise<void>;
  loading?: boolean;
}

function CompanyModal({ company, onClose, onSave, loading = false }: CompanyModalProps) {
  const [name, setName] = useState(company?.nome || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Por favor, preencha o nome da concessionária.');
      return;
    }

    await onSave({ name: name.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {company ? 'Editar Concessionária' : 'Nova Concessionária'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Concessionária *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: RGE - Rio Grande Energia"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


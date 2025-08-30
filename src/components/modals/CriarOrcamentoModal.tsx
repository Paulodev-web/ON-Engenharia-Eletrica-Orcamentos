import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface CriarOrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CriarOrcamentoModal({ isOpen, onClose }: CriarOrcamentoModalProps) {
  const { concessionarias, addBudget, utilityCompanies, fetchUtilityCompanies } = useApp();
  const [nome, setNome] = useState('');
  const [clientName, setClientName] = useState('');
  const [city, setCity] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar empresas quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      fetchUtilityCompanies();
    }
  }, [isOpen, fetchUtilityCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      alert('Por favor, preencha o nome do projeto.');
      return;
    }

    if (!selectedCompanyId) {
      alert('Por favor, selecione uma concessionária.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addBudget({
        project_name: nome.trim(),
        client_name: clientName.trim() || undefined,
        city: city.trim() || undefined,
        company_id: selectedCompanyId,
      });
      
      // Fechar o modal
      onClose();
      
      // Limpar formulário
      setNome('');
      setClientName('');
      setCity('');
      setSelectedCompanyId('');
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      alert('Erro ao criar orçamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Criar Novo Orçamento</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Projeto *
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o nome do projeto"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o nome do cliente (opcional)"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite a cidade (opcional)"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
              Concessionária *
            </label>
            <select
              id="companyId"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isSubmitting}
            >
              <option value="">Selecione uma concessionária</option>
              {utilityCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar e Iniciar Orçamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
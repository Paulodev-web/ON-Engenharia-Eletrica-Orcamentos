import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface CriarOrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CriarOrcamentoModal({ isOpen, onClose }: CriarOrcamentoModalProps) {
  const { concessionarias, addOrcamento, setCurrentOrcamento, setCurrentView } = useApp();
  const [nome, setNome] = useState('');
  const [concessionariaId, setConcessionariaId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !concessionariaId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const novoOrcamento = {
      nome: nome.trim(),
      concessionariaId,
      dataModificacao: new Date().toISOString().split('T')[0],
      status: 'Em Andamento' as const,
      postes: [],
    };

    addOrcamento(novoOrcamento);
    
    // Simular a criação do orçamento com ID
    const orcamentoComId = { ...novoOrcamento, id: Date.now().toString() };
    setCurrentOrcamento(orcamentoComId);
    setCurrentView('orcamento');
    
    onClose();
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
            />
          </div>

          <div>
            <label htmlFor="concessionaria" className="block text-sm font-medium text-gray-700 mb-1">
              Selecione a Concessionária *
            </label>
            <select
              id="concessionaria"
              value={concessionariaId}
              onChange={(e) => setConcessionariaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione uma concessionária</option>
              {concessionarias.map((concessionaria) => (
                <option key={concessionaria.id} value={concessionaria.id}>
                  {concessionaria.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Criar e Iniciar Orçamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
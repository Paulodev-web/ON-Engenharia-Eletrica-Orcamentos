import React, { useState } from 'react';
import { Copy, Check, Plus, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Orcamento, Poste, TipoFixacao } from '../types';

interface PainelContextoProps {
  orcamento: Orcamento;
  selectedPoste: Poste | null;
  onUpdatePoste: (posteId: string, updates: Partial<Poste>) => void;
}

export function PainelContexto({ orcamento, selectedPoste, onUpdatePoste }: PainelContextoProps) {
  const { gruposItens, concessionarias } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const concessionaria = concessionarias.find(c => c.id === orcamento.concessionariaId);
  const gruposFiltrados = gruposItens.filter(g => 
    g.concessionariaId === orcamento.concessionariaId &&
    g.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGrupo = (grupoId: string) => {
    if (!selectedPoste) return;
    
    if (!selectedPoste.gruposItens.includes(grupoId)) {
      const novosGrupos = [...selectedPoste.gruposItens, grupoId];
      onUpdatePoste(selectedPoste.id, { gruposItens: novosGrupos });
    }
    setSearchTerm('');
  };

  const handleRemoveGrupo = (grupoId: string) => {
    if (!selectedPoste) return;
    
    const novosGrupos = selectedPoste.gruposItens.filter(id => id !== grupoId);
    onUpdatePoste(selectedPoste.id, { gruposItens: novosGrupos });
  };

  const handleDuplicarPoste = () => {
    if (!selectedPoste) return;
    
    // Esta funcionalidade seria implementada no componente pai
    console.log('Duplicar poste:', selectedPoste.id);
  };

  const handleToggleConcluido = () => {
    if (!selectedPoste) return;
    
    onUpdatePoste(selectedPoste.id, { concluido: !selectedPoste.concluido });
  };

  if (!selectedPoste) {
    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {orcamento.nome}
          </h3>
          <p className="text-sm text-gray-600">
            Concessionária: {concessionaria?.sigla}
          </p>
        </div>

        <div className="space-y-2">
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Adicionar Cabeamento
          </button>
          <button 
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              orcamento.status === 'Finalizado'
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={orcamento.status === 'Finalizado'}
          >
            Finalizar Orçamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Configuração do {selectedPoste.nome}
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleConcluido}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${
              selectedPoste.concluido
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>{selectedPoste.concluido ? 'Concluído' : 'Marcar como Concluído'}</span>
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Fixação
          </label>
          <select
            value={selectedPoste.tipoFixacao || ''}
            onChange={(e) => onUpdatePoste(selectedPoste.id, { tipoFixacao: e.target.value as TipoFixacao })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione o tipo de fixação</option>
            <option value="Direto">Direto</option>
            <option value="Cruzeta">Cruzeta</option>
            <option value="Suporte">Suporte</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adicionar Grupos de Itens
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar grupos de itens..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && gruposFiltrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                {gruposFiltrados.map((grupo) => (
                  <button
                    key={grupo.id}
                    onClick={() => handleAddGrupo(grupo.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{grupo.nome}</div>
                    <div className="text-xs text-gray-500">{grupo.descricao}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Grupos Adicionados
          </label>
          {selectedPoste.gruposItens.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum grupo adicionado</p>
          ) : (
            <div className="space-y-1">
              {selectedPoste.gruposItens.map((grupoId) => {
                const grupo = gruposItens.find(g => g.id === grupoId);
                if (!grupo) return null;
                
                return (
                  <div key={grupoId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-sm font-medium">{grupo.nome}</span>
                    <button
                      onClick={() => handleRemoveGrupo(grupoId)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleDuplicarPoste}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicar Poste</span>
        </button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GrupoItem } from '../types';

export function GerenciarGrupos() {
  const { gruposItens, concessionarias, deleteGrupoItem, setCurrentView } = useApp();
  const [selectedConcessionaria, setSelectedConcessionaria] = useState<string>(concessionarias[0]?.id || '');

  const gruposFiltrados = gruposItens.filter(grupo => 
    grupo.concessionariaId === selectedConcessionaria
  );

  const handleEdit = (grupo: GrupoItem) => {
    // Implementar navegação para editor com grupo selecionado
    setCurrentView('editor-grupo');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este grupo de itens?')) {
      deleteGrupoItem(id);
    }
  };

  const handleNovoGrupo = () => {
    // Implementar criação de novo grupo
    setCurrentView('editor-grupo');
  };

  const concessionariaSelecionada = concessionarias.find(c => c.id === selectedConcessionaria);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Grupos de Itens</h2>
          <p className="text-gray-600">Crie e gerencie kits de materiais por concessionária</p>
        </div>
        <button
          onClick={handleNovoGrupo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Grupo de Itens</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">
              Visualizar grupos da concessionária:
            </label>
            <select
              value={selectedConcessionaria}
              onChange={(e) => setSelectedConcessionaria(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {concessionarias.map((concessionaria) => (
                <option key={concessionaria.id} value={concessionaria.id}>
                  {concessionaria.sigla}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {gruposFiltrados.map((grupo) => (
            <div key={grupo.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {grupo.nome}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {grupo.descricao}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {grupo.materiais.length} materiais
                    </span>
                    <span className="ml-3">
                      {concessionariaSelecionada?.sigla}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(grupo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(grupo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {gruposFiltrados.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Nenhum grupo de itens encontrado para {concessionariaSelecionada?.sigla}.
            </p>
            <button
              onClick={handleNovoGrupo}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Criar primeiro grupo de itens
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
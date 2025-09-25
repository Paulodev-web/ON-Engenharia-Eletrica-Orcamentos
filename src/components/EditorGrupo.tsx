import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Save, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAlertDialog } from '../hooks/useAlertDialog';
import { AlertDialog } from './ui/alert-dialog';
import { Material } from '../types';

interface MaterialGrupo {
  materialId: string;
  quantidade: number;
}

export function EditorGrupo() {
  const { 
    materiais, 
    utilityCompanies, 
    currentGroup, 
    addGroup, 
    updateGroup, 
    setCurrentView,
    setCurrentGroup,
    fetchMaterials 
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [concessionariaId, setConcessionariaId] = useState('');
  const [materiaisGrupo, setMateriaisGrupo] = useState<MaterialGrupo[]>([]);
  const [saving, setSaving] = useState(false);
  
  const alertDialog = useAlertDialog();
  
  // Inicializar campos quando o componente monta ou grupo muda
  useEffect(() => {
    if (currentGroup) {
      // Modo edição - preencher campos com dados do grupo
      setNomeGrupo(currentGroup.nome);
      setDescricao(currentGroup.descricao || '');
      setConcessionariaId(currentGroup.concessionariaId);
      setMateriaisGrupo(currentGroup.materiais.map(m => ({
        materialId: m.materialId,
        quantidade: m.quantidade
      })));
    } else {
      // Modo criação - limpar campos
      setNomeGrupo('');
      setDescricao('');
      setConcessionariaId(utilityCompanies[0]?.id || '');
      setMateriaisGrupo([]);
    }
  }, [currentGroup, utilityCompanies]);

  // Buscar materiais quando componente monta
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const materiaisFiltrados = materiais.filter(material =>
    material.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMaterial = (material: Material) => {
    const exists = materiaisGrupo.find(mg => mg.materialId === material.id);
    if (!exists) {
      setMateriaisGrupo([...materiaisGrupo, { materialId: material.id, quantidade: 1 }]);
    }
    setSearchTerm('');
  };

  const handleRemoveMaterial = (materialId: string) => {
    setMateriaisGrupo(materiaisGrupo.filter(mg => mg.materialId !== materialId));
  };

  const handleQuantidadeChange = (materialId: string, quantidade: number) => {
    if (quantidade <= 0) {
      handleRemoveMaterial(materialId);
      return;
    }
    
    setMateriaisGrupo(materiaisGrupo.map(mg => 
      mg.materialId === materialId ? { ...mg, quantidade } : mg
    ));
  };

  const handleSave = async () => {
    if (!nomeGrupo.trim()) {
      alertDialog.showError(
        'Campo Obrigatório',
        'Por favor, digite um nome para o grupo.'
      );
      return;
    }

    if (materiaisGrupo.length === 0) {
      alertDialog.showError(
        'Materiais Necessários',
        'Por favor, adicione pelo menos um material ao grupo.'
      );
      return;
    }

    if (!concessionariaId) {
      alertDialog.showError(
        'Campo Obrigatório',
        'Por favor, selecione uma concessionária.'
      );
      return;
    }

    try {
      setSaving(true);

      const groupData = {
        name: nomeGrupo.trim(),
        description: descricao.trim() || undefined,
        company_id: concessionariaId,
        materials: materiaisGrupo.map(mg => ({ 
          material_id: mg.materialId, 
          quantity: mg.quantidade 
        }))
      };

      if (currentGroup) {
        // Modo edição
        await updateGroup(currentGroup.id, groupData);
      } else {
        // Modo criação
        await addGroup(groupData);
      }

      // Limpar estado do grupo atual e voltar à tela de grupos
      setCurrentGroup(null);
      setCurrentView('grupos');
      alertDialog.showSuccess(
        currentGroup ? 'Grupo Atualizado' : 'Grupo Criado',
        currentGroup ? 'O grupo foi atualizado com sucesso.' : 'O grupo foi criado com sucesso.'
      );
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      alertDialog.showError(
        'Erro ao Salvar',
        'Erro ao salvar grupo. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
      {/* Painel Esquerdo - Materiais Disponíveis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Materiais Disponíveis
        </h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar material..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={saving}
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {materiaisFiltrados.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {material.codigo}
                </div>
                <div className="text-sm text-gray-600">
                  {material.descricao}
                </div>
                <div className="text-xs text-gray-500">
                  R$ {material.precoUnit.toFixed(2)} / {material.unidade}
                </div>
              </div>
              <button
                onClick={() => handleAddMaterial(material)}
                disabled={materiaisGrupo.some(mg => mg.materialId === material.id) || saving}
                className={`p-1 rounded-full transition-colors ${
                  materiaisGrupo.some(mg => mg.materialId === material.id) || saving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Painel Direito - Composição do Grupo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {currentGroup ? `Editar Grupo: ${currentGroup.nome}` : 'Novo Grupo de Itens'}
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Grupo *
            </label>
            <input
              type="text"
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o nome do grupo"
              disabled={saving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descreva o grupo de itens"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concessionária *
            </label>
            <select
              value={concessionariaId}
              onChange={(e) => setConcessionariaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={saving}
            >
              <option value="">Selecione uma concessionária</option>
              {utilityCompanies.map((concessionaria) => (
                <option key={concessionaria.id} value={concessionaria.id}>
                  {concessionaria.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Materiais do Grupo ({materiaisGrupo.length})
          </h4>

          {materiaisGrupo.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Adicione materiais do painel ao lado para compor este grupo.
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {materiaisGrupo.map(({ materialId, quantidade }) => {
                const material = materiais.find(m => m.id === materialId);
                if (!material) return null;

                return (
                  <div key={materialId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {material.descricao}
                      </div>
                      <div className="text-xs text-gray-500">
                        {material.codigo}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantidadeChange(materialId, quantidade - 1)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <input
                        type="number"
                        value={quantidade}
                        onChange={(e) => handleQuantidadeChange(materialId, parseInt(e.target.value) || 0)}
                        className="w-16 text-center px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                      
                      <button
                        onClick={() => handleQuantidadeChange(materialId, quantidade + 1)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>
              {saving 
                ? (currentGroup ? 'Atualizando...' : 'Salvando...') 
                : (currentGroup ? 'Atualizar Grupo' : 'Salvar Grupo de Itens')
              }
            </span>
          </button>
          
          <button
            onClick={() => {
              setCurrentGroup(null);
              setCurrentView('grupos');
            }}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </div>
      
      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}
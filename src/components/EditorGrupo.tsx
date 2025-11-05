import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Save, Loader2, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAlertDialog } from '../hooks/useAlertDialog';
import { AlertDialog } from './ui/alert-dialog';
import { Material } from '../types';

type SortField = 'descricao' | 'codigo' | 'precoUnit';
type SortOrder = 'asc' | 'desc';

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
  const [selectedConcessionarias, setSelectedConcessionarias] = useState<string[]>([]);
  const [materiaisGrupo, setMateriaisGrupo] = useState<MaterialGrupo[]>([]);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField>('descricao');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [inputStates, setInputStates] = useState<Record<string, string>>({});
  
  const alertDialog = useAlertDialog();
  
  // Inicializar campos quando o componente monta ou grupo muda
  useEffect(() => {
    if (currentGroup) {
      // Modo edição - preencher campos com dados do grupo (apenas uma concessionária)
      setNomeGrupo(currentGroup.nome);
      setDescricao(currentGroup.descricao || '');
      setSelectedConcessionarias([currentGroup.concessionariaId]);
      setMateriaisGrupo(currentGroup.materiais.map(m => ({
        materialId: m.materialId,
        quantidade: m.quantidade
      })));
      setInputStates({});
    } else {
      // Modo criação - limpar campos
      setNomeGrupo('');
      setDescricao('');
      setSelectedConcessionarias([]);
      setMateriaisGrupo([]);
      setInputStates({});
    }
  }, [currentGroup, utilityCompanies]);

  // Buscar materiais quando componente monta
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Função para calcular relevância da busca
  const getSearchRelevance = (material: Material, term: string): number => {
    if (!term) return 0;
    
    const searchLower = term.toLowerCase();
    const codigoLower = material.codigo.toLowerCase();
    const descricaoLower = material.descricao.toLowerCase();
    
    let score = 0;
    
    // Pontuação para código
    if (codigoLower === searchLower) {
      score += 1000; // Match exato no código
    } else if (codigoLower.startsWith(searchLower)) {
      score += 500; // Código começa com o termo
    } else if (codigoLower.includes(searchLower)) {
      score += 100; // Código contém o termo
    }
    
    // Pontuação para descrição
    const palavras = descricaoLower.split(/\s+/);
    
    // Match exato de palavra completa
    if (palavras.some(palavra => palavra === searchLower)) {
      score += 800;
    }
    
    // Palavra começa com o termo
    const palavrasComeçam = palavras.filter(palavra => palavra.startsWith(searchLower));
    if (palavrasComeçam.length > 0) {
      score += 400 * palavrasComeçam.length;
    }
    
    // Primeira palavra da descrição
    if (palavras[0]?.startsWith(searchLower)) {
      score += 300; // Bonus se for a primeira palavra
    }
    
    // Descrição começa com o termo (mesmo que não seja palavra completa)
    if (descricaoLower.startsWith(searchLower)) {
      score += 200;
    }
    
    // Apenas contém o termo (menor prioridade)
    if (descricaoLower.includes(searchLower)) {
      score += 50;
    }
    
    return score;
  };

  // Filtrar e ordenar materiais
  const materiaisFiltrados = materiais
    .filter(material => {
      const searchLower = searchTerm.toLowerCase();
      return material.codigo.toLowerCase().includes(searchLower) ||
             material.descricao.toLowerCase().includes(searchLower);
    })
    .map(material => ({
      material,
      relevance: searchTerm ? getSearchRelevance(material, searchTerm) : 0
    }))
    .sort((a, b) => {
      // Se há busca ativa, ordenar por relevância primeiro
      if (searchTerm) {
        const relevanceDiff = b.relevance - a.relevance;
        if (relevanceDiff !== 0) return relevanceDiff;
      }
      
      // Ordenação normal quando não há busca ou relevância igual
      let comparison = 0;
      
      switch (sortField) {
        case 'descricao':
          comparison = a.material.descricao.localeCompare(b.material.descricao, 'pt-BR', { sensitivity: 'base' });
          break;
        case 'codigo':
          comparison = a.material.codigo.localeCompare(b.material.codigo, 'pt-BR', { sensitivity: 'base' });
          break;
        case 'precoUnit':
          comparison = a.material.precoUnit - b.material.precoUnit;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    })
    .map(item => item.material);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />;
  };

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

  const handleQuantidadeInputChange = (materialId: string, value: string) => {
    // Atualizar o estado do input imediatamente para permitir edição livre
    setInputStates(prev => ({ ...prev, [materialId]: value }));
    
    // Aceitar vírgula ou ponto como separador decimal
    const normalizedValue = value.replace(',', '.');
    const quantidade = parseFloat(normalizedValue);
    
    // Se o valor for válido e positivo, atualizar
    if (!isNaN(quantidade) && quantidade > 0) {
      handleQuantidadeChange(materialId, quantidade);
    }
  };

  const handleQuantidadeBlur = (materialId: string, value: string) => {
    // Ao sair do campo, validar e corrigir se necessário
    const normalizedValue = value.replace(',', '.');
    const quantidade = parseFloat(normalizedValue);
    
    if (isNaN(quantidade) || quantidade <= 0) {
      // Se inválido, definir como 1
      handleQuantidadeChange(materialId, 1);
      setInputStates(prev => ({ ...prev, [materialId]: '1' }));
    } else {
      // Limpar o estado do input (usar o valor do state)
      setInputStates(prev => {
        const newState = { ...prev };
        delete newState[materialId];
        return newState;
      });
    }
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

    if (selectedConcessionarias.length === 0) {
      alertDialog.showError(
        'Campo Obrigatório',
        'Por favor, selecione pelo menos uma concessionária.'
      );
      return;
    }

    try {
      setSaving(true);

      const materialsData = materiaisGrupo.map(mg => ({ 
        material_id: mg.materialId, 
        quantity: mg.quantidade 
      }));

      if (currentGroup) {
        // Modo edição - atualizar o grupo atual e criar cópias para outras concessionárias
        const currentCompanyId = currentGroup.concessionariaId;
        
        // Atualizar o grupo atual
        const groupData = {
          name: nomeGrupo.trim(),
          description: descricao.trim() || undefined,
          company_id: currentCompanyId,
          materials: materialsData
        };
        await updateGroup(currentGroup.id, groupData);
        
        // Identificar concessionárias adicionais selecionadas (que não são a atual)
        const additionalCompanyIds = selectedConcessionarias.filter(
          id => id !== currentCompanyId
        );
        
        // Criar cópias do grupo para as outras concessionárias selecionadas
        if (additionalCompanyIds.length > 0) {
          await addGroup({
            name: nomeGrupo.trim(),
            description: descricao.trim() || undefined,
            company_ids: additionalCompanyIds,
            materials: materialsData
          });
        }
        
        // Limpar estado do grupo atual e voltar à tela de grupos
        setCurrentGroup(null);
        setCurrentView('grupos');
        
        let message = 'O grupo foi atualizado com sucesso.';
        if (additionalCompanyIds.length > 0) {
          message += ` ${additionalCompanyIds.length} cópia(s) ${additionalCompanyIds.length > 1 ? 'foram criadas' : 'foi criada'} para ${additionalCompanyIds.length > 1 ? 'outras concessionárias' : 'outra concessionária'} selecionada${additionalCompanyIds.length > 1 ? 's' : ''}.`;
        }
        
        alertDialog.showSuccess(
          'Grupo Atualizado',
          message
        );
      } else {
        // Modo criação - criar grupos independentes para cada concessionária
        await addGroup({
          name: nomeGrupo.trim(),
          description: descricao.trim() || undefined,
          company_ids: selectedConcessionarias,
          materials: materialsData
        });
        
        // Limpar estado do grupo atual e voltar à tela de grupos
        setCurrentGroup(null);
        setCurrentView('grupos');
        
        const message = selectedConcessionarias.length > 1
          ? `${selectedConcessionarias.length} grupos foram criados com sucesso (um para cada concessionária selecionada).`
          : 'O grupo foi criado com sucesso.';
        
        alertDialog.showSuccess(
          'Grupo(s) Criado(s)',
          message
        );
      }
    } catch (error) {
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
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar material..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Limpar busca"
                disabled={saving}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Feedback de busca */}
          {searchTerm && (
            <div className="mt-2 mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 font-medium">
                  🔍 Buscando: "{searchTerm}"
                </span>
                <span className="text-blue-600">
                  {materiaisFiltrados.length} resultado{materiaisFiltrados.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
          
          {/* Controles de ordenação */}
          <div className="mt-2 flex items-center space-x-2 text-xs">
            <span className="text-gray-500">Ordenar:</span>
            <button
              onClick={() => handleSort('descricao')}
              disabled={saving}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                sortField === 'descricao'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Descrição
              {getSortIcon('descricao')}
            </button>
            <button
              onClick={() => handleSort('codigo')}
              disabled={saving}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                sortField === 'codigo'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Código
              {getSortIcon('codigo')}
            </button>
            <button
              onClick={() => handleSort('precoUnit')}
              disabled={saving}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                sortField === 'precoUnit'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Preço
              {getSortIcon('precoUnit')}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {materiaisFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? 'Nenhum material encontrado com essa busca.'
                  : 'Carregando materiais...'}
              </p>
            </div>
          ) : (
            materiaisFiltrados.map((material) => (
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
            ))
          )}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Concessionária(s) *
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {utilityCompanies.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma concessionária disponível</p>
              ) : (
                <div className="space-y-2">
                  {utilityCompanies.map((concessionaria) => {
                    const isCurrentGroupCompany = currentGroup && concessionaria.id === currentGroup.concessionariaId;
                    return (
                      <label
                        key={concessionaria.id}
                        className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                          isCurrentGroupCompany ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedConcessionarias.includes(concessionaria.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConcessionarias([...selectedConcessionarias, concessionaria.id]);
                            } else {
                              // Não permitir desmarcar a concessionária atual do grupo em edição
                              if (isCurrentGroupCompany) {
                                alertDialog.showError(
                                  'Não Permitido',
                                  'Não é possível remover a concessionária atual do grupo. Selecione outras concessionárias para criar cópias.'
                                );
                                return;
                              }
                              setSelectedConcessionarias(selectedConcessionarias.filter(id => id !== concessionaria.id));
                            }
                          }}
                          disabled={saving}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {concessionaria.nome}
                          {isCurrentGroupCompany && (
                            <span className="ml-2 text-xs text-blue-600 font-medium">(atual)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedConcessionarias.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {currentGroup ? (
                  <>
                    {selectedConcessionarias.length === 1 
                      ? 'O grupo será atualizado na concessionária atual.'
                      : `O grupo será atualizado na concessionária atual e ${selectedConcessionarias.length - 1} cópia(s) ${selectedConcessionarias.length - 1 > 1 ? 'serão criadas' : 'será criada'} para ${selectedConcessionarias.length - 1 > 1 ? 'outras concessionárias' : 'outra concessionária'} selecionada${selectedConcessionarias.length - 1 > 1 ? 's' : ''}.`
                    }
                  </>
                ) : (
                  <>
                    {selectedConcessionarias.length} concessionária{selectedConcessionarias.length > 1 ? 's' : ''} selecionada{selectedConcessionarias.length > 1 ? 's' : ''}. 
                    {selectedConcessionarias.length > 1 && ' Serão criados grupos independentes para cada uma.'}
                  </>
                )}
              </p>
            )}
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
              {materiaisGrupo
                .map(({ materialId, quantidade }) => {
                  const material = materiais.find(m => m.id === materialId);
                  return { materialId, quantidade, material };
                })
                .filter(({ material }) => material !== undefined)
                .sort((a, b) => {
                  if (!a.material || !b.material) return 0;
                  return a.material.descricao.localeCompare(b.material.descricao, 'pt-BR', { sensitivity: 'base' });
                })
                .map(({ materialId, quantidade, material }) => {
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
                        onClick={() => {
                          const newQty = Math.max(1, quantidade - 1);
                          handleQuantidadeChange(materialId, newQty);
                          setInputStates(prev => {
                            const newState = { ...prev };
                            delete newState[materialId];
                            return newState;
                          });
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Diminuir 1"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <input
                        type="text"
                        value={inputStates[materialId] ?? quantidade.toString().replace('.', ',')}
                        onChange={(e) => handleQuantidadeInputChange(materialId, e.target.value)}
                        onBlur={(e) => handleQuantidadeBlur(materialId, e.target.value)}
                        className="w-20 text-center px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="1"
                      />
                      
                      <button
                        onClick={() => {
                          handleQuantidadeChange(materialId, quantidade + 1);
                          setInputStates(prev => {
                            const newState = { ...prev };
                            delete newState[materialId];
                            return newState;
                          });
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Aumentar 1"
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
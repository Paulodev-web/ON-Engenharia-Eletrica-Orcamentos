import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAlertDialog } from '../hooks/useAlertDialog';
import { AlertDialog } from './ui/alert-dialog';
import { Material } from '../types';

export function GerenciarMateriais() {
  const { materiais, loadingMaterials, fetchMaterials, addMaterial, updateMaterial, deleteMaterial, deleteAllMaterials, importMaterialsFromCSV } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Adicione os seguintes estados e a ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const alertDialog = useAlertDialog();

  // Buscar materiais quando o componente for montado
  useEffect(() => {
    fetchMaterials();
  }, []);

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

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage(null);
    try {
      const result = await importMaterialsFromCSV(file);
      setImportMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (error: any) {
      setImportMessage({ type: 'error', text: error.message || 'Ocorreu um erro desconhecido.' });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const filteredMateriais = materiais.filter(material =>
    material.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (material: Material) => {
    if (operationLoading) return;
    setEditingMaterial(material);
    setShowModal(true);
  };

  const handleDelete = async (id: string, materialName?: string) => {
    if (operationLoading) return;
    
    const material = materiais.find(m => m.id === id);
    const name = materialName || material?.descricao || 'este material';
    
    alertDialog.showConfirm(
      'Excluir Material',
      `Tem certeza que deseja excluir ${name}?`,
      async () => {
        setOperationLoading(true);
        try {
          await deleteMaterial(id);
          showMessage('success', 'Material excluído com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir material:', error);
          showMessage('error', 'Erro ao excluir material. Tente novamente.');
        } finally {
          setOperationLoading(false);
        }
      },
      {
        type: 'destructive',
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleDeleteAll = async () => {
    if (operationLoading) return;
    
    alertDialog.showConfirm(
      'ATENÇÃO: Excluir TODOS os Materiais',
      `Esta ação irá EXCLUIR PERMANENTEMENTE todos os ${materiais.length} materiais cadastrados. Esta ação NÃO PODE SER DESFEITA. Tem certeza absoluta que deseja continuar?`,
      async () => {
        setOperationLoading(true);
        try {
          await deleteAllMaterials();
          showMessage('success', 'Todos os materiais foram excluídos com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir todos os materiais:', error);
          showMessage('error', 'Erro ao excluir materiais. Tente novamente.');
        } finally {
          setOperationLoading(false);
        }
      },
      {
        type: 'destructive',
        confirmText: 'SIM, EXCLUIR TUDO',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleCloseModal = () => {
    if (operationLoading) return;
    setShowModal(false);
    setEditingMaterial(null);
  };

  const handleRefresh = async () => {
    if (operationLoading) return;
    try {
      await fetchMaterials();
      showMessage('success', 'Lista de materiais atualizada!');
    } catch (error) {
      showMessage('error', 'Erro ao atualizar lista de materiais.');
    }
  };

  const handleSaveMaterial = async (materialData: Omit<Material, 'id'>) => {
    setOperationLoading(true);
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, materialData);
        showMessage('success', 'Material atualizado com sucesso!');
      } else {
        await addMaterial(materialData);
        showMessage('success', 'Material adicionado com sucesso!');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      showMessage('error', 'Erro ao salvar material. Tente novamente.');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Materiais</h2>
          <p className="text-gray-600">Cadastre e gerencie o catálogo completo de materiais</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh}
            disabled={loadingMaterials || operationLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMaterials ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span>Atualizar</span>
          </button>
          {/* Input de arquivo oculto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".csv"
            className="hidden"
          />
          {/* Botão que aciona o input */}
          <button 
            onClick={triggerFileInput}
            disabled={operationLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            <span>Importar Planilha</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={operationLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Material</span>
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={operationLoading || materiais.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-5 w-5" />
            <span>Excluir Todos</span>
          </button>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`p-4 rounded-lg flex-shrink-0 ${
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

      {/* Área para feedback de importação */}
      {importMessage && (
        <div className={`p-4 rounded-lg flex-shrink-0 ${
          importMessage.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <p>{importMessage.text}</p>
            <button
              onClick={() => setImportMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {loadingMaterials ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-500">Carregando materiais...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unit.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMateriais.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {material.codigo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {material.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {material.precoUnit.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {material.unidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(material)}
                          disabled={operationLoading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id, material.descricao)}
                          disabled={operationLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {operationLoading ? (
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
            {filteredMateriais.length === 0 && !loadingMaterials && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">
                    {searchTerm ? 'Nenhum material encontrado.' : 'Nenhum material cadastrado.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Cadastrar primeiro material
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <MaterialModal
          material={editingMaterial}
          onClose={handleCloseModal}
          onSave={handleSaveMaterial}
          loading={operationLoading}
        />
      )}
      
      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}

interface MaterialModalProps {
  material: Material | null;
  onClose: () => void;
  onSave: (material: Omit<Material, 'id'>) => Promise<void>;
  loading?: boolean;
}

function MaterialModal({ material, onClose, onSave, loading = false }: MaterialModalProps) {
  const [formData, setFormData] = useState({
    codigo: material?.codigo || '',
    descricao: material?.descricao || '',
    precoUnit: material?.precoUnit?.toString() || '',
    unidade: material?.unidade || '',
  });
  
  const alertDialog = useAlertDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const precoUnit = parseFloat(formData.precoUnit) || 0;
    
    if (!formData.codigo.trim() || !formData.descricao.trim() || !formData.unidade.trim()) {
      alertDialog.showError(
        'Campos Obrigatórios',
        'Por favor, preencha todos os campos obrigatórios.'
      );
      return;
    }

    if (precoUnit <= 0) {
      alertDialog.showError(
        'Preço Inválido',
        'Por favor, informe um preço válido maior que zero.'
      );
      return;
    }

    await onSave({
      ...formData,
      precoUnit
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {material ? 'Editar Material' : 'Novo Material'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço Unitário *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.precoUnit}
              onChange={(e) => setFormData({ ...formData, precoUnit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade *
            </label>
            <select
              value={formData.unidade}
              onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione uma unidade</option>
              <option value="UN">UN - Unidade</option>
              <option value="M">M - Metro</option>
              <option value="KG">KG - Quilograma</option>
              <option value="L">L - Litro</option>
              <option value="M²">M² - Metro Quadrado</option>
              <option value="M³">M³ - Metro Cúbico</option>
            </select>
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
      
      <AlertDialog {...alertDialog.dialogProps} />
    </div>
  );
}
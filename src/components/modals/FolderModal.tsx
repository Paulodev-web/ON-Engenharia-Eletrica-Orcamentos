import { useState, useEffect } from 'react';
import { X, Folder, AlertCircle } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color?: string) => Promise<void>;
  initialName?: string;
  initialColor?: string;
  mode: 'create' | 'edit';
}

const FOLDER_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Cinza', value: '#6B7280' },
  { name: 'Laranja', value: '#F97316' },
];

export function FolderModal({ isOpen, onClose, onSave, initialName = '', initialColor = '#3B82F6', mode }: FolderModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setColor(initialColor);
      setError(null);
    }
  }, [isOpen, initialName, initialColor]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Por favor, insira um nome para a pasta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(name.trim(), color);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar pasta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Nova Pasta' : 'Editar Pasta'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Nome da Pasta */}
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Pasta
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Projetos 2024"
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Cor da Pasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor da Pasta
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((folderColor) => (
                <button
                  key={folderColor.value}
                  type="button"
                  onClick={() => setColor(folderColor.value)}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    color === folderColor.value
                      ? 'border-gray-900 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                  title={folderColor.name}
                >
                  <Folder
                    className="h-6 w-6"
                    style={{ color: folderColor.value }}
                    fill={folderColor.value}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização</p>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Folder
                className="h-8 w-8 flex-shrink-0"
                style={{ color }}
                fill={color}
              />
              <span className="text-gray-900 font-medium">
                {name.trim() || 'Nome da pasta'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : mode === 'create' ? 'Criar Pasta' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}


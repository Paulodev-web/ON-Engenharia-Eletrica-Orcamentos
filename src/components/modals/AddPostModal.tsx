import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: {x: number, y: number} | null;
  onSubmit: (postTypeId: string, postName: string) => Promise<void>;
}

export function AddPostModal({ isOpen, onClose, coordinates, onSubmit }: AddPostModalProps) {
  const { postTypes, loadingPostTypes } = useApp();
  const [postName, setPostName] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetar formulário quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setPostName('');
      setSelectedPostType('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPostType || !postName.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(selectedPostType, postName.trim());
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar poste:', error);
      alert('Erro ao adicionar poste. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adicionar Novo Poste</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {coordinates && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Posição: X: {coordinates.x.toFixed(2)}, Y: {coordinates.y.toFixed(2)}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="postName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Poste *
            </label>
            <input
              type="text"
              id="postName"
              value={postName}
              onChange={(e) => setPostName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: P-01"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="postType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Poste *
            </label>
            {loadingPostTypes ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-500">Carregando tipos...</span>
              </div>
            ) : (
              <select
                id="postType"
                value={selectedPostType}
                onChange={(e) => setSelectedPostType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
              >
                <option value="">Selecione um tipo de poste</option>
                {postTypes.map((postType) => (
                  <option key={postType.id} value={postType.id}>
                    {postType.name} {postType.code && `(${postType.code})`} - R$ {postType.price.toFixed(2)}
                    {postType.height_m && ` - ${postType.height_m}m`}
                  </option>
                ))}
              </select>
            )}
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
              disabled={isSubmitting || loadingPostTypes || postTypes.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <span>Adicionar Poste</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

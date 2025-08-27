import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { CanvasVisual } from './CanvasVisual';
import { PainelContexto } from './PainelContexto';
import { Poste } from '../types';
import { Table, Trash2 } from 'lucide-react';

export function AreaTrabalho() {
  const { currentOrcamento, updateOrcamento } = useApp();
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentOrcamento) {
    return <div>Orçamento não encontrado</div>;
  }

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imagemPlanta = e.target?.result as string;
        updateOrcamento(currentOrcamento.id, { imagemPlanta });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    if (window.confirm('Tem certeza que deseja excluir a imagem? Todos os postes também serão removidos.')) {
      updateOrcamento(currentOrcamento.id, { 
        imagemPlanta: undefined,
        postes: [] // Limpa todos os postes
      });
      setSelectedPoste(null); // Limpa o poste selecionado
    }
  };

  const handleDeletePoste = (posteId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este poste?')) {
      const newPostes = currentOrcamento.postes.filter(p => p.id !== posteId);
      updateOrcamento(currentOrcamento.id, { postes: newPostes });
      if (selectedPoste?.id === posteId) {
        setSelectedPoste(null);
      }
    }
  };

  const addPoste = (x: number, y: number, tipo: TipoPoste) => {
    const novoPoste: Poste = {
      id: Date.now().toString(),
      nome: `P-${String(currentOrcamento.postes.length + 1).padStart(2, '0')}`,
      tipo,
      x,
      y,
      gruposItens: [],
      concluido: false,
    };

    const newPostes = [...currentOrcamento.postes, novoPoste];
    updateOrcamento(currentOrcamento.id, { postes: newPostes });
  };

  const updatePoste = (posteId: string, updates: Partial<Poste>) => {
    const newPostes = currentOrcamento.postes.map(p => 
      p.id === posteId ? { ...p, ...updates } : p
    );
    updateOrcamento(currentOrcamento.id, { postes: newPostes });
    
    if (selectedPoste && selectedPoste.id === posteId) {
      setSelectedPoste({ ...selectedPoste, ...updates });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Canvas Visual - Painel Superior */}
      <div className="h-2/3 bg-white border-b">
        <CanvasVisual
          orcamento={currentOrcamento}
          selectedPoste={selectedPoste}
          onPosteClick={setSelectedPoste}
          onAddPoste={addPoste}
          onUpdatePoste={updatePoste}
          onUploadImage={() => fileInputRef.current?.click()}
          onDeleteImage={handleDeleteImage}
          onDeletePoste={handleDeletePoste}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadImage}
          className="hidden"
        />
      </div>

      {/* Painéis Inferiores */}
      <div className="h-1/3 flex">
        {/* Painel de Contexto (Esquerda) */}
        <div className="flex-1 bg-white border-r">
          <PainelContexto
            orcamento={currentOrcamento}
            selectedPoste={selectedPoste}
            onUpdatePoste={updatePoste}
          />
        </div>

        {/* Lista de Postes (Direita) */}
        <div className="flex-1 bg-white">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Table className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium">Lista de Postes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentOrcamento.postes.map((poste) => (
                    <tr 
                      key={poste.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedPoste?.id === poste.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedPoste(poste)}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">{poste.nome}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{poste.tipo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          poste.concluido ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {poste.concluido ? 'Concluído' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoste(poste.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
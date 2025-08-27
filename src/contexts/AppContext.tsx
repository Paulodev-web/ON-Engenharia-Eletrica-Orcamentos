import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Material, GrupoItem, Concessionaria, Orcamento } from '../types';
import { materiais as initialMateriais, gruposItens as initialGrupos, concessionarias, orcamentos as initialOrcamentos } from '../data/mockData';

interface AppContextType {
  materiais: Material[];
  gruposItens: GrupoItem[];
  concessionarias: Concessionaria[];
  orcamentos: Orcamento[];
  currentOrcamento: Orcamento | null;
  currentView: string;
  
  setCurrentView: (view: string) => void;
  setCurrentOrcamento: (orcamento: Orcamento | null) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, material: Omit<Material, 'id'>) => void;
  deleteMaterial: (id: string) => void;
  addGrupoItem: (grupo: Omit<GrupoItem, 'id'>) => void;
  updateGrupoItem: (id: string, grupo: Omit<GrupoItem, 'id'>) => void;
  deleteGrupoItem: (id: string) => void;
  addOrcamento: (orcamento: Omit<Orcamento, 'id'>) => void;
  updateOrcamento: (id: string, orcamento: Partial<Orcamento>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [materiais, setMateriais] = useState<Material[]>(initialMateriais);
  const [gruposItens, setGruposItens] = useState<GrupoItem[]>(initialGrupos);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(initialOrcamentos);
  const [currentOrcamento, setCurrentOrcamento] = useState<Orcamento | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const newMaterial = { ...material, id: Date.now().toString() };
    setMateriais(prev => [...prev, newMaterial]);
  };

  const updateMaterial = (id: string, material: Omit<Material, 'id'>) => {
    setMateriais(prev => prev.map(m => m.id === id ? { ...material, id } : m));
  };

  const deleteMaterial = (id: string) => {
    setMateriais(prev => prev.filter(m => m.id !== id));
  };

  const addGrupoItem = (grupo: Omit<GrupoItem, 'id'>) => {
    const newGrupo = { ...grupo, id: Date.now().toString() };
    setGruposItens(prev => [...prev, newGrupo]);
  };

  const updateGrupoItem = (id: string, grupo: Omit<GrupoItem, 'id'>) => {
    setGruposItens(prev => prev.map(g => g.id === id ? { ...grupo, id } : g));
  };

  const deleteGrupoItem = (id: string) => {
    setGruposItens(prev => prev.filter(g => g.id !== id));
  };

  const addOrcamento = (orcamento: Omit<Orcamento, 'id'>) => {
    const newOrcamento = { ...orcamento, id: Date.now().toString() };
    setOrcamentos(prev => [...prev, newOrcamento]);
  };

  const updateOrcamento = (id: string, updates: Partial<Orcamento>) => {
    setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    if (currentOrcamento && currentOrcamento.id === id) {
      setCurrentOrcamento(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return (
    <AppContext.Provider value={{
      materiais,
      gruposItens,
      concessionarias,
      orcamentos,
      currentOrcamento,
      currentView,
      setCurrentView,
      setCurrentOrcamento,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      addGrupoItem,
      updateGrupoItem,
      deleteGrupoItem,
      addOrcamento,
      updateOrcamento,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
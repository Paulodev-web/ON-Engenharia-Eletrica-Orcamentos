import { createContext, useContext, useState, ReactNode } from 'react';
import { Material, GrupoItem, Concessionaria, Orcamento } from '../types';
import { gruposItens as initialGrupos, concessionarias, orcamentos as initialOrcamentos } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';

interface AppContextType {
  materiais: Material[];
  gruposItens: GrupoItem[];
  concessionarias: Concessionaria[];
  orcamentos: Orcamento[];
  currentOrcamento: Orcamento | null;
  currentView: string;
  loadingMaterials: boolean;
  
  setCurrentView: (view: string) => void;
  setCurrentOrcamento: (orcamento: Orcamento | null) => void;
  fetchMaterials: () => Promise<void>;
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, material: Omit<Material, 'id'>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addGrupoItem: (grupo: Omit<GrupoItem, 'id'>) => void;
  updateGrupoItem: (id: string, grupo: Omit<GrupoItem, 'id'>) => void;
  deleteGrupoItem: (id: string) => void;
  addOrcamento: (orcamento: Omit<Orcamento, 'id'>) => void;
  updateOrcamento: (id: string, orcamento: Partial<Orcamento>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [gruposItens, setGruposItens] = useState<GrupoItem[]>(initialGrupos);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(initialOrcamentos);
  const [currentOrcamento, setCurrentOrcamento] = useState<Orcamento | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);

  const fetchMaterials = async () => {
    try {
      setLoadingMaterials(true);
      console.log('Buscando materiais do Supabase...');
      
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar materiais:', error);
        throw error;
      }

      console.log('Materiais encontrados:', data);

      // Mapear os dados do banco para o formato do frontend
      const materiaisFormatados: Material[] = data?.map(item => ({
        id: item.id,
        codigo: item.code || '',
        descricao: item.name || '',
        precoUnit: parseFloat(item.price) || 0,
        unidade: item.unit || '',
      })) || [];

      setMateriais(materiaisFormatados);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      // Em caso de erro, mantém a lista vazia
      setMateriais([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const addMaterial = async (material: Omit<Material, 'id'>) => {
    try {
      console.log('Adicionando material:', material);
      
      // Mapear dados do frontend para o formato do banco
      const materialData = {
        code: material.codigo,
        name: material.descricao,
        price: material.precoUnit,
        unit: material.unidade,
      };

      const { data, error } = await supabase
        .from('materials')
        .insert(materialData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar material:', error);
        throw error;
      }

      console.log('Material adicionado com sucesso:', data);

      // Mapear dados do banco para o formato do frontend e adicionar ao estado
      const newMaterial: Material = {
        id: data.id,
        codigo: data.code || '',
        descricao: data.name || '',
        precoUnit: parseFloat(data.price) || 0,
        unidade: data.unit || '',
      };

      setMateriais(prev => [...prev, newMaterial]);
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      throw error;
    }
  };

  const updateMaterial = async (id: string, material: Omit<Material, 'id'>) => {
    try {
      console.log('Atualizando material:', id, material);
      
      // Mapear dados do frontend para o formato do banco
      const materialData = {
        code: material.codigo,
        name: material.descricao,
        price: material.precoUnit,
        unit: material.unidade,
      };

      const { data, error } = await supabase
        .from('materials')
        .update(materialData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar material:', error);
        throw error;
      }

      console.log('Material atualizado com sucesso:', data);

      // Mapear dados do banco para o formato do frontend e atualizar o estado
      const updatedMaterial: Material = {
        id: data.id,
        codigo: data.code || '',
        descricao: data.name || '',
        precoUnit: parseFloat(data.price) || 0,
        unidade: data.unit || '',
      };

      setMateriais(prev => prev.map(m => m.id === id ? updatedMaterial : m));
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      console.log('Excluindo material:', id);

      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir material:', error);
        throw error;
      }

      console.log('Material excluído com sucesso:', id);

      // Remover do estado local
      setMateriais(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      throw error;
    }
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
      loadingMaterials,
      setCurrentView,
      setCurrentOrcamento,
      fetchMaterials,
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
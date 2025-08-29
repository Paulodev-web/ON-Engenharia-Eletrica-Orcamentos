import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
  
  // Novos estados para gerenciar grupos
  utilityCompanies: Concessionaria[];
  itemGroups: GrupoItem[];
  loadingCompanies: boolean;
  loadingGroups: boolean;
  currentGroup: GrupoItem | null;
  
  setCurrentView: (view: string) => void;
  setCurrentOrcamento: (orcamento: Orcamento | null) => void;
  setCurrentGroup: (group: GrupoItem | null) => void;
  
  // Funções de materiais
  fetchMaterials: () => Promise<void>;
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, material: Omit<Material, 'id'>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  
  // Funções para concessionárias e grupos
  fetchUtilityCompanies: () => Promise<void>;
  fetchItemGroups: (companyId: string) => Promise<void>;
  addGroup: (groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => Promise<void>;
  updateGroup: (groupId: string, groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  
  // Funções locais (legacy)
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
  
  // Novos estados para gerenciar grupos
  const [utilityCompanies, setUtilityCompanies] = useState<Concessionaria[]>([]);
  const [itemGroups, setItemGroups] = useState<GrupoItem[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [currentGroup, setCurrentGroup] = useState<GrupoItem | null>(null);

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

  // Funções para concessionárias
  const fetchUtilityCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      console.log('Buscando concessionárias do Supabase...');
      
      const { data, error } = await supabase
        .from('utility_companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar concessionárias:', error);
        throw error;
      }

      console.log('Concessionárias encontradas:', data);

      // Mapear os dados do banco para o formato do frontend
      const concessionariasFormatadas: Concessionaria[] = data?.map(item => ({
        id: item.id,
        nome: item.name || '',
        sigla: item.name || '', // Usando name como sigla até termos campo específico
      })) || [];

      setUtilityCompanies(concessionariasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar concessionárias:', error);
      setUtilityCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  // Funções para grupos de itens
  const fetchItemGroups = useCallback(async (companyId: string) => {
    try {
      setLoadingGroups(true);
      console.log('Buscando grupos de itens do Supabase para empresa:', companyId);
      
      // Buscar templates de grupos para a empresa
      const { data: templatesData, error: templatesError } = await supabase
        .from('item_group_templates')
        .select(`
          id,
          name,
          description,
          company_id,
          template_materials (
            material_id,
            quantity,
            materials (
              id,
              code,
              name,
              price,
              unit
            )
          )
        `)
        .eq('company_id', companyId);

      if (templatesError) {
        console.error('Erro ao buscar templates de grupos:', templatesError);
        throw templatesError;
      }

      console.log('Templates encontrados:', templatesData);

      // Mapear os dados do banco para o formato do frontend
      const gruposFormatados: GrupoItem[] = templatesData?.map(template => ({
        id: template.id,
        nome: template.name || '',
        descricao: template.description || '',
        concessionariaId: template.company_id,
        materiais: template.template_materials?.map(tm => ({
          materialId: tm.material_id,
          quantidade: tm.quantity,
        })) || []
      })) || [];

      setItemGroups(gruposFormatados);
    } catch (error) {
      console.error('Erro ao buscar grupos de itens:', error);
      setItemGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const addGroup = async (groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => {
    try {
      console.log('Adicionando grupo:', groupData);
      
      // Primeiro criar o registro principal na tabela item_group_templates
      const { data: groupTemplate, error: groupError } = await supabase
        .from('item_group_templates')
        .insert({
          name: groupData.name,
          description: groupData.description || null,
          company_id: groupData.company_id,
        })
        .select()
        .single();

      if (groupError) {
        console.error('Erro ao criar template do grupo:', groupError);
        throw groupError;
      }

      console.log('Template do grupo criado:', groupTemplate);

      // Inserir materiais do grupo na tabela template_materials
      if (groupData.materials.length > 0) {
        const materialsData = groupData.materials.map(material => ({
          template_id: groupTemplate.id,
          material_id: material.material_id,
          quantity: material.quantity,
        }));

        const { error: materialsError } = await supabase
          .from('template_materials')
          .insert(materialsData);

        if (materialsError) {
          console.error('Erro ao adicionar materiais do grupo:', materialsError);
          throw materialsError;
        }

        console.log('Materiais do grupo adicionados com sucesso');
      }

      // Atualizar a UI com os dados atualizados
      await fetchItemGroups(groupData.company_id);
    } catch (error) {
      console.error('Erro ao adicionar grupo:', error);
      throw error;
    }
  };

  const updateGroup = async (groupId: string, groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => {
    try {
      console.log('Atualizando grupo:', groupId, groupData);
      
      // Atualizar o registro principal na tabela item_group_templates
      const { error: updateError } = await supabase
        .from('item_group_templates')
        .update({
          name: groupData.name,
          description: groupData.description || null,
          company_id: groupData.company_id,
        })
        .eq('id', groupId);

      if (updateError) {
        console.error('Erro ao atualizar template do grupo:', updateError);
        throw updateError;
      }

      console.log('Template do grupo atualizado');

      // Deletar todos os materiais existentes para este grupo
      const { error: deleteError } = await supabase
        .from('template_materials')
        .delete()
        .eq('template_id', groupId);

      if (deleteError) {
        console.error('Erro ao deletar materiais existentes:', deleteError);
        throw deleteError;
      }

      console.log('Materiais existentes removidos');

      // Inserir nova lista de materiais
      if (groupData.materials.length > 0) {
        const materialsData = groupData.materials.map(material => ({
          template_id: groupId,
          material_id: material.material_id,
          quantity: material.quantity,
        }));

        const { error: materialsError } = await supabase
          .from('template_materials')
          .insert(materialsData);

        if (materialsError) {
          console.error('Erro ao adicionar novos materiais do grupo:', materialsError);
          throw materialsError;
        }

        console.log('Novos materiais do grupo adicionados');
      }

      // Atualizar a UI com os dados atualizados
      await fetchItemGroups(groupData.company_id);
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      throw error;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      console.log('Excluindo grupo:', groupId);

      // A configuração ON DELETE CASCADE cuidará dos materiais automaticamente
      const { error } = await supabase
        .from('item_group_templates')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Erro ao excluir grupo:', error);
        throw error;
      }

      console.log('Grupo excluído com sucesso:', groupId);

      // Remover do estado local
      setItemGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
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
      
      // Novos estados para gerenciar grupos
      utilityCompanies,
      itemGroups,
      loadingCompanies,
      loadingGroups,
      currentGroup,
      
      setCurrentView,
      setCurrentOrcamento,
      setCurrentGroup,
      
      // Funções de materiais
      fetchMaterials,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      
      // Funções para concessionárias e grupos
      fetchUtilityCompanies,
      fetchItemGroups,
      addGroup,
      updateGroup,
      deleteGroup,
      
      // Funções locais (legacy)
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
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Material, GrupoItem, Concessionaria, Orcamento, BudgetPostDetail, BudgetDetails, PostType } from '../types';
import { gruposItens as initialGrupos, concessionarias, orcamentos as initialOrcamentos } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { processAndUploadMaterials } from '../services/materialImportService';

interface AppContextType {
  materiais: Material[];
  gruposItens: GrupoItem[];
  concessionarias: Concessionaria[];
  orcamentos: Orcamento[];
  budgets: Orcamento[];
  budgetDetails: BudgetDetails | null;
  postTypes: PostType[];
  currentOrcamento: Orcamento | null;
  currentView: string;
  loadingMaterials: boolean;
  loadingBudgets: boolean;
  loadingBudgetDetails: boolean;
  loadingPostTypes: boolean;
  loadingUpload: boolean;
  loading: boolean;
  
  // Novos estados para gerenciar grupos
  utilityCompanies: Concessionaria[];
  itemGroups: GrupoItem[];
  loadingCompanies: boolean;
  loadingGroups: boolean;
  currentGroup: GrupoItem | null;
  
  setCurrentView: (view: string) => void;
  setCurrentOrcamento: (orcamento: Orcamento | null) => void;
  setCurrentGroup: (group: GrupoItem | null) => void;
  
  // Funções de sincronização
  fetchAllCoreData: () => Promise<void>;
  
  // Funções de materiais
  fetchMaterials: () => Promise<void>;
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, material: Omit<Material, 'id'>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  deleteAllMaterials: () => Promise<void>;
  importMaterialsFromCSV: (file: File) => Promise<{ success: boolean; message: string }>;
  
  // Funções de orçamentos
  fetchBudgets: () => Promise<void>;
  addBudget: (budgetData: { project_name: string; client_name?: string; city?: string; company_id: string; }) => Promise<void>;
  updateBudget: (budgetId: string, budgetData: { project_name?: string; client_name?: string; city?: string; company_id?: string; }) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  duplicateBudget: (budgetId: string) => Promise<void>;
  finalizeBudget: (budgetId: string) => Promise<void>;
  fetchBudgetDetails: (budgetId: string) => Promise<void>;
  uploadPlanImage: (budgetId: string, file: File) => Promise<void>;
  deletePlanImage: (budgetId: string) => Promise<void>;
  
  // Funções de tipos de poste
  fetchPostTypes: () => Promise<void>;
  addPostToBudget: (newPostData: { budget_id: string; post_type_id: string; name: string; x_coord: number; y_coord: number; }) => Promise<string>;
  addGroupToPost: (groupId: string, postId: string) => Promise<void>;
  deletePostFromBudget: (postId: string) => Promise<void>;
  removeGroupFromPost: (postGroupId: string) => Promise<void>;
  updateMaterialQuantityInPostGroup: (postGroupId: string, materialId: string, newQuantity: number) => Promise<void>;
  
  // Funções para materiais avulsos
  addLooseMaterialToPost: (postId: string, materialId: string, quantity: number, price: number) => Promise<void>;
  updateLooseMaterialQuantity: (postMaterialId: string, newQuantity: number) => Promise<void>;
  removeLooseMaterialFromPost: (postMaterialId: string) => Promise<void>;
  
  // Função para atualizar preços consolidados
  updateConsolidatedMaterialPrice: (budgetId: string, materialId: string, newPrice: number) => Promise<void>;
  
  // Funções para concessionárias e grupos
  fetchUtilityCompanies: () => Promise<void>;
  addUtilityCompany: (data: { name: string }) => Promise<void>;
  updateUtilityCompany: (id: string, data: { name: string }) => Promise<void>;
  deleteUtilityCompany: (id: string) => Promise<void>;
  fetchItemGroups: (companyId: string) => Promise<void>;
  addGroup: (groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => Promise<void>;
  updateGroup: (groupId: string, groupData: { name: string; description?: string; company_id: string; materials: { material_id: string; quantity: number }[] }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  
  // Funções para tipos de poste
  addPostType: (data: { name: string; code?: string; description?: string; shape?: string; height_m?: number; price: number }) => Promise<void>;
  updatePostType: (id: string, data: { name: string; code?: string; description?: string; shape?: string; height_m?: number; price: number }) => Promise<void>;
  deletePostType: (id: string) => Promise<void>;
  
  // Funções locais (legacy)
  addGrupoItem: (grupo: Omit<GrupoItem, 'id'>) => void;
  updateGrupoItem: (id: string, grupo: Omit<GrupoItem, 'id'>) => void;
  deleteGrupoItem: (id: string) => void;
  addOrcamento: (orcamento: Omit<Orcamento, 'id'>) => void;
  updateOrcamento: (id: string, orcamento: Partial<Orcamento>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * ⚡ LIMITES DE PAGINAÇÃO OTIMIZADOS:
 * - Materiais: Sem limite (paginação automática por fetchAllRecords)
 * - Orçamentos: Sem limite (paginação automática por fetchAllRecords)
 * - Postes por orçamento: 500 (range otimizado)
 * - Grupos por concessionária: 200 (range otimizado)
 * - Grupos por poste: 2000 (500 postes x ~4 grupos média)
 * 
 * Esses limites foram ajustados para reduzir o volume de dados nas requisições
 * sem comprometer a funcionalidade para casos de uso reais.
 */

/**
 * Função helper para buscar TODOS os registros de uma tabela usando paginação automática
 * @param tableName - Nome da tabela
 * @param selectQuery - Query de seleção (ex: '*' ou 'id, name, ...')
 * @param orderBy - Campo para ordenar
 * @param ascending - Ordem crescente ou decrescente
 * @param filters - Filtros adicionais (opcional)
 * @returns Array com todos os registros
 */
async function fetchAllRecords(
  tableName: string,
  selectQuery: string = '*',
  orderBy: string = 'created_at',
  ascending: boolean = false,
  filters?: any
): Promise<any[]> {
  let allRecords: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    let query = supabase
      .from(tableName)
      .select(selectQuery, { count: 'exact' })
      .order(orderBy, { ascending })
      .range(from, to);

    // Aplicar filtros adicionais se fornecidos
    if (filters) {
      Object.keys(filters).forEach(key => {
        query = query.eq(key, filters[key]);
      });
    }

    const { data, error, count } = await query;

    if (error) {
      console.error(`Erro ao buscar registros de "${tableName}":`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [gruposItens, setGruposItens] = useState<GrupoItem[]>(initialGrupos);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(initialOrcamentos);
  const [budgets, setBudgets] = useState<Orcamento[]>([]);
  const [budgetDetails, setBudgetDetails] = useState<BudgetDetails | null>(null);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [currentOrcamento, setCurrentOrcamento] = useState<Orcamento | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingBudgets, setLoadingBudgets] = useState<boolean>(false);
  const [loadingBudgetDetails, setLoadingBudgetDetails] = useState<boolean>(false);
  const [loadingPostTypes, setLoadingPostTypes] = useState<boolean>(false);
  const [loadingUpload, setLoadingUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Novos estados para gerenciar grupos
  const [utilityCompanies, setUtilityCompanies] = useState<Concessionaria[]>([]);
  const [itemGroups, setItemGroups] = useState<GrupoItem[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [currentGroup, setCurrentGroup] = useState<GrupoItem | null>(null);

  // Efeito para inicializar o AppContext apenas após o AuthContext estar estável
  useEffect(() => {
    // Pequeno delay para garantir que o AuthContext esteja completamente inicializado
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);


  const fetchMaterials = useCallback(async () => {
    try {
      setLoadingMaterials(true);

      // Buscar TODOS os materiais usando a função helper de paginação
      const allMaterials = await fetchAllRecords('materials', '*', 'created_at', false);

      // Mapear os dados do banco para o formato do frontend
      const materiaisFormatados: Material[] = allMaterials.map(item => ({
        id: item.id,
        codigo: item.code || '',
        descricao: item.name || '',
        precoUnit: parseFloat(item.price) || 0,
        unidade: item.unit || '',
      }));

      // Remover duplicatas baseado no ID (manter apenas o primeiro)
      const materiaisUnicos: Material[] = [];
      const idsVistos = new Set<string>();
      
      for (const material of materiaisFormatados) {
        if (!idsVistos.has(material.id)) {
          idsVistos.add(material.id);
          materiaisUnicos.push(material);
        }
      }

      setMateriais(materiaisUnicos);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      // Em caso de erro, mantém a lista vazia
      setMateriais([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  const addMaterial = async (material: Omit<Material, 'id'>) => {
    try {

      
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



      // Mapear dados do banco para o formato do frontend e atualizar o estado
      const updatedMaterial: Material = {
        id: data.id,
        codigo: data.code || '',
        descricao: data.name || '',
        precoUnit: parseFloat(data.price) || 0,
        unidade: data.unit || '',
      };

      setMateriais(prev => prev.map(m => m.id === id ? updatedMaterial : m));
      
      // Sincronizar dados após mutação - CRÍTICO para preços atualizados
      console.log("💰 Material atualizado, sincronizando preços...");
      await fetchMaterials();
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {


      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir material:', error);
        throw error;
      }



      // Remover do estado local
      setMateriais(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      throw error;
    }
  };

  const deleteAllMaterials = async () => {
    try {
      // Chama a função RPC do Supabase que deleta todos os materiais
      const { error } = await supabase.rpc('delete_all_materials');

      if (error) {
        console.error('Erro ao excluir todos os materiais:', error);
        throw error;
      }

      // Limpar o estado local
      setMateriais([]);
      
      // Recarregar para garantir
      await fetchMaterials();
    } catch (error) {
      console.error('Erro ao excluir todos os materiais:', error);
      throw error;
    }
  };

  const importMaterialsFromCSV = async (file: File): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    
    try {
      // Chamar o serviço que processa e envia em lotes automaticamente
      const result = await processAndUploadMaterials(file);
      
      // Verificar se o processamento foi bem-sucedido
      if (!result.success) {
        return { success: false, message: result.message };
      }

      // Recarregar os dados após importação
      await fetchAllCoreData();
      
      // A mensagem já vem formatada do serviço com as estatísticas
      let message = result.message;

      return { 
        success: true, 
        message 
      };

    } catch (error: any) {
      console.error('❌ Erro no processo de importação:', error);
      return { 
        success: false, 
        message: `Falha na importação: ${error.message}` 
      };
    } finally {
      setLoading(false);
    }
  };

  // Funções para orçamentos
  const fetchBudgets = useCallback(async () => {
    if (!user) {

      return;
    }

    try {
      setLoadingBudgets(true);

      
      // Buscar TODOS os orçamentos usando a função helper de paginação
      const data = await fetchAllRecords('budgets', '*, plan_image_url', 'created_at', false, { user_id: user.id });




      // Mapear os dados do banco para o formato do frontend
      const orcamentosFormatados: Orcamento[] = data.map(item => {
        // Normalizar o status para garantir compatibilidade
        let normalizedStatus: 'Em Andamento' | 'Finalizado' = 'Em Andamento';
        if (item.status === 'Finalizado' || item.status === 'finalized' || item.status === 'Concluído') {
          normalizedStatus = 'Finalizado';
        }
        
        return {
          id: item.id,
          nome: item.project_name || '',
          concessionariaId: item.company_id || '', // Usar company_id do banco
          company_id: item.company_id, // ID da empresa no Supabase
          dataModificacao: item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : '',
          status: normalizedStatus,
          postes: [], // Será implementado quando conectarmos os postes
          ...(item.client_name && { clientName: item.client_name }),
          ...(item.city && { city: item.city }),
          ...(item.plan_image_url && { imagemPlanta: item.plan_image_url }),
        };
      });

      setBudgets(orcamentosFormatados);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      setBudgets([]);
    } finally {
      setLoadingBudgets(false);
    }
  }, [user]);

  const addBudget = async (budgetData: { project_name: string; client_name?: string; city?: string; company_id: string; }) => {
    if (!user) {

      return;
    }

    try {

      
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          project_name: budgetData.project_name,
          client_name: budgetData.client_name || null,
          city: budgetData.city || null,
          company_id: budgetData.company_id, // CRÍTICO: Incluir company_id
          user_id: user.id,
          status: 'Em Andamento',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar orçamento:', error);
        throw error;
      }



      // Mapear dados do banco para o formato do frontend e adicionar ao estado
      // IMPORTANTE: Usar TODOS os dados que vem do banco, incluindo company_id
      const newBudget: Orcamento = {
        id: data.id,
        nome: data.project_name || '',
        concessionariaId: data.company_id || '', // Usar company_id do banco
        company_id: data.company_id, // CRÍTICO: ID da empresa no Supabase
        dataModificacao: data.updated_at ? new Date(data.updated_at).toISOString().split('T')[0] : '',
        status: data.status as 'Em Andamento' | 'Finalizado',
        postes: [],
        ...(data.client_name && { clientName: data.client_name }),
        ...(data.city && { city: data.city }),
      };



      setBudgets(prev => [newBudget, ...prev]);
      
      // Definir como orçamento atual e mudar para a área de trabalho
      setCurrentOrcamento(newBudget);
      setCurrentView('orcamento');
    } catch (error) {
      console.error('Erro ao adicionar orçamento:', error);
      throw error;
    }
  };

  const updateBudget = async (budgetId: string, budgetData: { project_name?: string; client_name?: string; city?: string; company_id?: string; }) => {
    if (!user) {
      return;
    }

    try {
      const updateData: any = {};
      
      if (budgetData.project_name !== undefined) updateData.project_name = budgetData.project_name;
      if (budgetData.client_name !== undefined) updateData.client_name = budgetData.client_name || null;
      if (budgetData.city !== undefined) updateData.city = budgetData.city || null;
      if (budgetData.company_id !== undefined) updateData.company_id = budgetData.company_id;

      const { data, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', budgetId)
        .eq('user_id', user.id) // Garantir que só pode editar seus próprios orçamentos
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar orçamento:', error);
        throw error;
      }

      // Mapear dados do banco para o formato do frontend
      const updatedBudget: Orcamento = {
        id: data.id,
        nome: data.project_name || '',
        concessionariaId: data.company_id || '',
        company_id: data.company_id,
        dataModificacao: data.updated_at ? new Date(data.updated_at).toISOString().split('T')[0] : '',
        status: data.status as 'Em Andamento' | 'Finalizado',
        postes: [],
        ...(data.client_name && { clientName: data.client_name }),
        ...(data.city && { city: data.city }),
      };

      // Atualizar o estado local
      setBudgets(prev => prev.map(budget => 
        budget.id === budgetId ? updatedBudget : budget
      ));

      // Se este orçamento está atualmente selecionado, atualizar também
      if (currentOrcamento && currentOrcamento.id === budgetId) {
        setCurrentOrcamento(updatedBudget);
      }
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      throw error;
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) {
      return;
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', user.id); // Garantir que só pode excluir seus próprios orçamentos

      if (error) {
        console.error('Erro ao excluir orçamento:', error);
        throw error;
      }

      // Remover do estado local
      setBudgets(prev => prev.filter(budget => budget.id !== budgetId));

      // Se este orçamento está atualmente selecionado, limpar seleção
      if (currentOrcamento && currentOrcamento.id === budgetId) {
        setCurrentOrcamento(null);
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      throw error;
    }
  };

  const duplicateBudget = async (budgetId: string) => {
    if (!user) {
      console.log('❌ Usuário não autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔄 Iniciando duplicação do orçamento ${budgetId}...`);

      // 1. Buscar dados completos do orçamento original
      const { data: originalBudget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single();

      if (budgetError) {
        console.error('Erro ao buscar orçamento original:', budgetError);
        throw budgetError;
      }

      console.log(`📋 Orçamento original encontrado: ${originalBudget.project_name}`);

      // 2. Criar novo orçamento com dados copiados
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({
          project_name: `${originalBudget.project_name} (Cópia)`,
          client_name: originalBudget.client_name,
          city: originalBudget.city,
          company_id: originalBudget.company_id,
          user_id: user.id,
          status: 'Em Andamento', // Sempre iniciar como "Em Andamento"
          plan_image_url: originalBudget.plan_image_url, // Copiar URL da imagem
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar novo orçamento:', createError);
        throw createError;
      }

      console.log(`✅ Novo orçamento criado: ${newBudget.id}`);

      // 3. Buscar todos os postes do orçamento original com seus detalhes
      const { data: originalPosts, error: postsError, count: postsCount } = await supabase
        .from('budget_posts')
        .select(`
          *,
          post_item_groups (
            id,
            name,
            template_id,
            post_item_group_materials (
              material_id,
              quantity,
              price_at_addition
            )
          ),
          post_materials (
            material_id,
            quantity,
            price_at_addition
          )
        `, { count: 'exact' })
        .eq('budget_id', budgetId)
        .range(0, 1000); // Limite de 1000 postes por orçamento (otimizado)

      if (postsError) {
        console.error('Erro ao buscar postes originais:', postsError);
        throw postsError;
      }

      console.log(`📍 ${originalPosts?.length || 0} postes encontrados para duplicar`);

      // 4. Duplicar cada poste
      if (originalPosts && originalPosts.length > 0) {
        for (const originalPost of originalPosts) {
          // 4.1. Criar novo poste
          const { data: newPost, error: postError } = await supabase
            .from('budget_posts')
            .insert({
              budget_id: newBudget.id,
              post_type_id: originalPost.post_type_id,
              name: originalPost.name,
              x_coord: originalPost.x_coord,
              y_coord: originalPost.y_coord,
            })
            .select()
            .single();

          if (postError) {
            console.error('Erro ao criar novo poste:', postError);
            throw postError;
          }

          console.log(`  ✅ Poste "${originalPost.name}" duplicado`);

          // 4.2. Duplicar grupos de itens do poste
          if (originalPost.post_item_groups && originalPost.post_item_groups.length > 0) {
            for (const originalGroup of originalPost.post_item_groups) {
              // Criar nova instância do grupo
              const { data: newGroup, error: groupError } = await supabase
                .from('post_item_groups')
                .insert({
                  budget_post_id: newPost.id,
                  template_id: originalGroup.template_id,
                  name: originalGroup.name,
                })
                .select()
                .single();

              if (groupError) {
                console.error('Erro ao criar grupo no poste:', groupError);
                throw groupError;
              }

              // Duplicar materiais do grupo
              if (originalGroup.post_item_group_materials && originalGroup.post_item_group_materials.length > 0) {
                const groupMaterials = originalGroup.post_item_group_materials.map(material => ({
                  post_item_group_id: newGroup.id,
                  material_id: material.material_id,
                  quantity: material.quantity,
                  price_at_addition: material.price_at_addition,
                }));

                const { error: materialsError } = await supabase
                  .from('post_item_group_materials')
                  .insert(groupMaterials);

                if (materialsError) {
                  console.error('Erro ao duplicar materiais do grupo:', materialsError);
                  throw materialsError;
                }
              }

              console.log(`    ✅ Grupo "${originalGroup.name}" duplicado com ${originalGroup.post_item_group_materials?.length || 0} materiais`);
            }
          }

          // 4.3. Duplicar materiais avulsos do poste
          if (originalPost.post_materials && originalPost.post_materials.length > 0) {
            const looseMaterials = originalPost.post_materials.map(material => ({
              post_id: newPost.id,
              material_id: material.material_id,
              quantity: material.quantity,
              price_at_addition: material.price_at_addition,
            }));

            const { error: looseMaterialsError } = await supabase
              .from('post_materials')
              .insert(looseMaterials);

            if (looseMaterialsError) {
              console.error('Erro ao duplicar materiais avulsos:', looseMaterialsError);
              throw looseMaterialsError;
            }

            console.log(`    ✅ ${originalPost.post_materials.length} materiais avulsos duplicados`);
          }
        }
      }

      console.log(`🎉 Orçamento duplicado com sucesso!`);

      // 5. Atualizar a lista de orçamentos
      await fetchBudgets();

      // 6. Definir o novo orçamento como atual e navegar para ele
      const mappedNewBudget: Orcamento = {
        id: newBudget.id,
        nome: newBudget.project_name || '',
        concessionariaId: newBudget.company_id || '',
        company_id: newBudget.company_id,
        dataModificacao: newBudget.updated_at ? new Date(newBudget.updated_at).toISOString().split('T')[0] : '',
        status: 'Em Andamento',
        postes: [],
        ...(newBudget.client_name && { clientName: newBudget.client_name }),
        ...(newBudget.city && { city: newBudget.city }),
        ...(newBudget.plan_image_url && { imagemPlanta: newBudget.plan_image_url }),
      };

      setCurrentOrcamento(mappedNewBudget);
      setCurrentView('orcamento');

    } catch (error) {
      console.error('❌ Erro ao duplicar orçamento:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const finalizeBudget = async (budgetId: string) => {
    try {
      setLoading(true); // Usar estado de loading geral
      
      console.log(`🔒 Iniciando finalização do orçamento ${budgetId}...`);
      
      const { error } = await supabase.rpc('finalize_budget', {
        p_budget_id: budgetId,
      });

      if (error) {
        console.error('Erro ao finalizar orçamento:', error.message);
        // Adicionar lógica para notificar o usuário (ex: toast)
        throw new Error(`Falha ao finalizar o orçamento: ${error.message}`);
      }

      console.log(`✅ RPC finalize_budget executado com sucesso para orçamento ${budgetId}`);

      // MUDANÇA CRÍTICA: Sincronizar TODOS os dados de catálogo
      console.log("💾 Orçamento finalizado, sincronizando todos os dados...");
      await Promise.all([
        fetchBudgets(),
        fetchMaterials(),
        fetchPostTypes(),
        fetchUtilityCompanies(),
      ]);

      console.log("🎉 Finalização do orçamento concluída com sucesso!");
      
    } catch (error) {
      console.error('❌ Erro na finalização do orçamento:', error);
      // Lidar com o erro
      throw error;
    } finally {
      setLoading(false); // Desligar o estado de loading geral
    }
  };

  const uploadPlanImage = async (budgetId: string, file: File) => {
    if (!user) {

      return;
    }

    try {
      setLoadingUpload(true);


      // a. Gerar um caminho de arquivo único para evitar conflitos
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `public/budgets/${budgetId}/${timestamp}_${sanitizedFileName}`;

      // b. Fazer o upload do arquivo para o bucket 'plans'
      const { error: uploadError } = await supabase.storage
        .from('plans')
        .upload(filePath, file);

      if (uploadError) {
        // Se o bucket não existir, tentar criá-lo
        if (uploadError.message?.includes('Bucket not found')) {

          
          const { error: createBucketError } = await supabase.storage
            .createBucket('plans', {
              public: true,
              allowedMimeTypes: ['image/*', 'application/pdf'],
              fileSizeLimit: 10 * 1024 * 1024 // 10MB
            });

          if (createBucketError) {
            console.error('Erro ao criar bucket:', createBucketError);
            throw createBucketError;
          }


          
          // Tentar fazer upload novamente
          const { error: retryUploadError } = await supabase.storage
            .from('plans')
            .upload(filePath, file);

          if (retryUploadError) {
            console.error('Erro ao fazer upload do arquivo após criar bucket:', retryUploadError);
            throw retryUploadError;
          }
        } else {
          console.error('Erro ao fazer upload do arquivo:', uploadError);
          throw uploadError;
        }
      }



      // c. Obter a URL pública do arquivo
      const { data: publicUrlData } = supabase.storage
        .from('plans')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;


      // d. Atualizar a tabela budgets, salvando a publicUrl na coluna plan_image_url
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ plan_image_url: publicUrl })
        .eq('id', budgetId);

      if (updateError) {
        console.error('Erro ao atualizar orçamento com URL da imagem:', updateError);
        throw updateError;
      }



      // e. Atualizar o currentOrcamento no estado local para refletir a nova URL da imagem
      if (currentOrcamento && currentOrcamento.id === budgetId) {
        setCurrentOrcamento(prev => prev ? { ...prev, imagemPlanta: publicUrl } : null);
      }

      // Atualizar também a lista de budgets
      setBudgets(prev => prev.map(budget => 
        budget.id === budgetId 
          ? { ...budget, imagemPlanta: publicUrl }
          : budget
      ));

    } catch (error) {
      console.error('Erro no upload da imagem da planta:', error);
      throw error;
    } finally {
      setLoadingUpload(false);
    }
  };

  const deletePlanImage = async (budgetId: string) => {
    if (!user) {

      return;
    }

    try {
      setLoadingUpload(true);


      // Atualizar a tabela budgets, removendo a URL da imagem
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ plan_image_url: null })
        .eq('id', budgetId);

      if (updateError) {
        console.error('Erro ao remover URL da imagem do orçamento:', updateError);
        throw updateError;
      }



      // Atualizar o currentOrcamento no estado local
      if (currentOrcamento && currentOrcamento.id === budgetId) {
        setCurrentOrcamento(prev => prev ? { ...prev, imagemPlanta: undefined } : null);
      }

      // Atualizar também a lista de budgets
      setBudgets(prev => prev.map(budget => 
        budget.id === budgetId 
          ? { ...budget, imagemPlanta: undefined }
          : budget
      ));

    } catch (error) {
      console.error('Erro ao deletar imagem da planta:', error);
      throw error;
    } finally {
      setLoadingUpload(false);
    }
  };

  const fetchBudgetDetails = useCallback(async (budgetId: string) => {
    try {
      setLoadingBudgetDetails(true);

      
      // Buscar informações do orçamento principal
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          id,
          project_name,
          company_id,
          client_name,
          city,
          status,
          created_at,
          updated_at,
          plan_image_url
        `)
        .eq('id', budgetId)
        .single();

      if (budgetError) {
        console.error('ERRO DETALHADO DO SUPABASE (budget):', budgetError);
        console.error('Tipo do erro:', typeof budgetError);
        console.error('Mensagem do erro:', budgetError.message);
        console.error('Código do erro:', budgetError.code);
        console.error('Detalhes do erro:', budgetError.details);
        console.error('Hint do erro:', budgetError.hint);
        throw budgetError;
      }
      
      // Query aninhada para buscar todos os postes relacionados ao orçamento
      const { data: postsData, error: postsError, count: postsCount } = await supabase
        .from('budget_posts')
        .select(`
          id,
          name,
          x_coord,
          y_coord,
          post_types (
            id,
            name,
            code,
            description,
            shape,
            height_m,
            price
          ),
          post_item_groups (
            id,
            name,
            template_id,
            post_item_group_materials (
              material_id,
              quantity,
              price_at_addition,
              materials (
                id,
                code,
                name,
                description,
                unit,
                price
              )
            )
          ),
          post_materials (
            id,
            material_id,
            quantity,
            price_at_addition,
            materials (
              id,
              code,
              name,
              description,
              unit,
              price
            )
          )
        `, { count: 'exact' })
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: true })
        .range(0, 500); // Limite de 500 postes por orçamento (otimizado)

      if (postsError) {
        console.error('ERRO DETALHADO DO SUPABASE (posts):', postsError);
        console.error('Tipo do erro:', typeof postsError);
        console.error('Mensagem do erro:', postsError.message);
        console.error('Código do erro:', postsError.code);
        console.error('Detalhes do erro:', postsError.details);
        console.error('Hint do erro:', postsError.hint);
        throw postsError;
      }



      // Mapear os dados dos postes para o tipo correto
      const postsFormatted: BudgetPostDetail[] = postsData?.map(post => ({
        id: post.id,
        name: post.name || '',
        x_coord: post.x_coord || 0,
        y_coord: post.y_coord || 0,
        post_types: post.post_types ? {
          id: (post.post_types as any).id,
          name: (post.post_types as any).name || '',
          code: (post.post_types as any).code || undefined,
          description: (post.post_types as any).description || undefined,
          shape: (post.post_types as any).shape || undefined,
          height_m: (post.post_types as any).height_m || undefined,
          price: (post.post_types as any).price || 0
        } : null,
        post_item_groups: post.post_item_groups?.map(group => ({
          id: group.id,
          name: group.name || '',
          template_id: group.template_id || undefined,
          post_item_group_materials: group.post_item_group_materials?.map(material => {
            return {
              material_id: material.material_id,
              quantity: material.quantity || 0,
              price_at_addition: material.price_at_addition || 0,
              materials: material.materials ? {
                id: (material.materials as any).id,
                code: (material.materials as any).code || '',
                name: (material.materials as any).name || '',
                description: (material.materials as any).description || undefined,
                unit: (material.materials as any).unit || '',
                price: (material.materials as any).price || 0
              } : {
                id: '',
                code: '',
                name: 'Material não encontrado',
                description: undefined,
                unit: '',
                price: 0
              }
            };
          }) || []
        })) || [],
        post_materials: post.post_materials?.map(material => ({
          id: material.id,
          post_id: post.id,
          material_id: material.material_id,
          quantity: material.quantity || 0,
          price_at_addition: material.price_at_addition || 0,
          materials: material.materials ? {
            id: (material.materials as any).id,
            code: (material.materials as any).code || '',
            name: (material.materials as any).name || '',
            description: (material.materials as any).description || undefined,
            unit: (material.materials as any).unit || '',
            price: (material.materials as any).price || 0
          } : {
            id: '',
            code: '',
            name: 'Material não encontrado',
            description: undefined,
            unit: '',
            price: 0
          }
        })) || []
      })) || [];

      // Combinar dados do orçamento e postes em um objeto BudgetDetails
      const budgetDetails: BudgetDetails = {
        id: budgetData.id,
        name: budgetData.project_name || '',
        company_id: budgetData.company_id || undefined,
        client_name: budgetData.client_name || undefined,
        city: budgetData.city || undefined,
        status: budgetData.status || 'Em Andamento',
        created_at: budgetData.created_at || undefined,
        updated_at: budgetData.updated_at || undefined,
        plan_image_url: budgetData.plan_image_url || undefined,
        posts: postsFormatted
      };

      setBudgetDetails(budgetDetails);
    } catch (error) {
      console.error('ERRO DETALHADO DO SUPABASE (geral):', error);
      console.error('Tipo do erro:', typeof error);
      if (error && typeof error === 'object') {
        console.error('Mensagem do erro:', (error as any).message);
        console.error('Código do erro:', (error as any).code);
        console.error('Detalhes do erro:', (error as any).details);
        console.error('Hint do erro:', (error as any).hint);
        console.error('Stack do erro:', (error as any).stack);
      }
      setBudgetDetails(null);
    } finally {
      setLoadingBudgetDetails(false);
    }
  }, []);

  const fetchPostTypes = useCallback(async () => {
    try {
      setLoadingPostTypes(true);

      
      // Buscar TODOS os tipos de poste usando a função helper de paginação
      const data = await fetchAllRecords('post_types', '*', 'name', true);



      // Mapear os dados do banco para o formato do frontend
      const postTypesFormatted: PostType[] = data.map(item => ({
        id: item.id,
        name: item.name || '',
        code: item.code || undefined,
        description: item.description || undefined,
        shape: item.shape || undefined,
        height_m: item.height_m || undefined,
        price: parseFloat(item.price) || 0,
      }));

      setPostTypes(postTypesFormatted);
    } catch (error) {
      console.error('Erro ao buscar tipos de poste:', error);
      setPostTypes([]);
    } finally {
      setLoadingPostTypes(false);
    }
  }, []);

  const addPostType = async (data: { name: string; code?: string; description?: string; shape?: string; height_m?: number; price: number }) => {
    try {
      // Primeiro, criar o material correspondente
      const { data: newMaterial, error: materialError } = await supabase
        .from('materials')
        .insert({
          name: data.name.trim(),
          code: data.code?.trim() || null,
          description: data.description?.trim() || null,
          unit: 'unidade',
          price: data.price,
        })
        .select()
        .single();

      if (materialError) {
        console.error('❌ Erro ao criar material para tipo de poste:', {
          message: materialError.message,
          details: materialError.details,
          hint: materialError.hint,
          code: materialError.code
        });
        
        // Verificar se é erro de código duplicado
        if (materialError.code === '23505' && materialError.message?.includes('materials_code_key')) {
          throw new Error(`O código "${data.code}" já está sendo usado por outro material/tipo de poste. Por favor, escolha um código diferente.`);
        }
        
        throw new Error(`Erro ao criar material: ${materialError.message}`);
      }

      // Em seguida, criar o tipo de poste linkado ao material
      const { data: newPostType, error: postTypeError } = await supabase
        .from('post_types')
        .insert({
          name: data.name.trim(),
          code: data.code?.trim() || null,
          description: data.description?.trim() || null,
          shape: data.shape?.trim() || null,
          height_m: data.height_m || null,
          price: data.price,
          material_id: newMaterial.id, // Linkar com o material criado
        })
        .select()
        .single();

      if (postTypeError) {
        console.error('❌ Erro ao adicionar tipo de poste:', {
          message: postTypeError.message,
          details: postTypeError.details,
          hint: postTypeError.hint,
          code: postTypeError.code
        });
        
        // Se falhar ao criar post_type, deletar o material criado
        await supabase.from('materials').delete().eq('id', newMaterial.id);
        
        // Verificar se é erro de código duplicado
        if (postTypeError.code === '23505' && postTypeError.message?.includes('post_types_code_key')) {
          throw new Error(`O código "${data.code}" já está sendo usado por outro tipo de poste. Por favor, escolha um código diferente.`);
        }
        
        throw new Error(`Erro ao adicionar tipo de poste: ${postTypeError.message}`);
      }

      // Mapear dados do banco para o formato do frontend e adicionar ao estado
      const newPostTypeFormatted: PostType = {
        id: newPostType.id,
        name: newPostType.name || '',
        code: newPostType.code || undefined,
        description: newPostType.description || undefined,
        shape: newPostType.shape || undefined,
        height_m: newPostType.height_m || undefined,
        price: parseFloat(newPostType.price) || 0,
      };

      setPostTypes(prev => [...prev, newPostTypeFormatted].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Atualizar também a lista de materiais
      const newMaterialFormatted = {
        id: newMaterial.id,
        codigo: newMaterial.code || '',
        descricao: newMaterial.name || '',
        precoUnit: parseFloat(newMaterial.price) || 0,
        unidade: newMaterial.unit || '',
      };
      setMateriais(prev => [...prev, newMaterialFormatted]);
      
      // Sincronizar dados após mutação
      await fetchPostTypes();
    } catch (error: any) {
      console.error('❌ Erro ao adicionar tipo de poste (catch geral):', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      // Re-throw o erro para que o componente possa mostrá-lo ao usuário
      throw error;
    }
  };

  const updatePostType = async (id: string, data: { name: string; code?: string; description?: string; shape?: string; height_m?: number; price: number }) => {
    try {
      // Primeiro, buscar o post_type para obter o material_id
      const { data: currentPostType, error: fetchError } = await supabase
        .from('post_types')
        .select('material_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar tipo de poste:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        });
        throw new Error(`Erro ao buscar tipo de poste: ${fetchError.message}`);
      }

      // Atualizar o material correspondente (se existir)
      if (currentPostType.material_id) {
        const { error: materialError } = await supabase
          .from('materials')
          .update({
            name: data.name.trim(),
            code: data.code?.trim() || null,
            description: data.description?.trim() || null,
            price: data.price,
          })
          .eq('id', currentPostType.material_id);

        if (materialError) {
          console.error('❌ Erro ao atualizar material do tipo de poste:', {
            message: materialError.message,
            details: materialError.details,
            hint: materialError.hint,
            code: materialError.code
          });
          
          // Verificar se é erro de código duplicado
          if (materialError.code === '23505' && materialError.message?.includes('materials_code_key')) {
            throw new Error(`O código "${data.code}" já está sendo usado por outro material/tipo de poste. Por favor, escolha um código diferente.`);
          }
          
          throw new Error(`Erro ao atualizar material: ${materialError.message}`);
        }
      }

      // Atualizar o post_type
      const { data: updatedPostType, error: postTypeError } = await supabase
        .from('post_types')
        .update({
          name: data.name.trim(),
          code: data.code?.trim() || null,
          description: data.description?.trim() || null,
          shape: data.shape?.trim() || null,
          height_m: data.height_m || null,
          price: data.price,
        })
        .eq('id', id)
        .select()
        .single();

      if (postTypeError) {
        console.error('❌ Erro ao atualizar tipo de poste:', {
          message: postTypeError.message,
          details: postTypeError.details,
          hint: postTypeError.hint,
          code: postTypeError.code
        });
        
        // Verificar se é erro de código duplicado
        if (postTypeError.code === '23505' && postTypeError.message?.includes('post_types_code_key')) {
          throw new Error(`O código "${data.code}" já está sendo usado por outro tipo de poste. Por favor, escolha um código diferente.`);
        }
        
        throw new Error(`Erro ao atualizar tipo de poste: ${postTypeError.message}`);
      }

      // Mapear dados do banco para o formato do frontend e atualizar o estado
      const updatedPostTypeFormatted: PostType = {
        id: updatedPostType.id,
        name: updatedPostType.name || '',
        code: updatedPostType.code || undefined,
        description: updatedPostType.description || undefined,
        shape: updatedPostType.shape || undefined,
        height_m: updatedPostType.height_m || undefined,
        price: parseFloat(updatedPostType.price) || 0,
      };

      setPostTypes(prev => 
        prev.map(postType => postType.id === id ? updatedPostTypeFormatted : postType)
           .sort((a, b) => a.name.localeCompare(b.name))
      );

      // Atualizar também a lista de materiais se existir material vinculado
      if (currentPostType.material_id) {
        const updatedMaterialFormatted = {
          id: currentPostType.material_id,
          codigo: data.code?.trim() || '',
          descricao: data.name.trim(),
          precoUnit: data.price,
          unidade: 'unidade',
        };
        
        setMateriais(prev => 
          prev.map(material => 
            material.id === currentPostType.material_id ? updatedMaterialFormatted : material
          )
        );
      }
      
      // Sincronizar dados após mutação - CRÍTICO para preços de postes atualizados
      console.log("🏗️ Tipo de poste atualizado, sincronizando preços...");
      await Promise.all([fetchPostTypes(), fetchMaterials()]);
      
      // Se há um orçamento aberto com detalhes carregados, recarregar para refletir mudanças
      if (budgetDetails?.id) {
        console.log("🔄 Recarregando orçamento atual para refletir mudanças no tipo de poste...");
        await fetchBudgetDetails(budgetDetails.id);
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tipo de poste (catch geral):', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      // Re-throw o erro para que o componente possa mostrá-lo ao usuário
      throw error;
    }
  };

  const deletePostType = async (id: string) => {
    try {
      // Primeiro, buscar o material_id antes de deletar
      const { data: postTypeData, error: fetchError } = await supabase
        .from('post_types')
        .select('material_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar tipo de poste para deletar:', fetchError);
        throw fetchError;
      }

      // Deletar o post_type (o ON DELETE CASCADE vai deletar o material automaticamente)
      const { error: deleteError } = await supabase
        .from('post_types')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Erro ao excluir tipo de poste:', deleteError);
        throw deleteError;
      }

      // Remover do estado local
      setPostTypes(prev => prev.filter(postType => postType.id !== id));
      
      // Remover também da lista de materiais se existir material vinculado
      if (postTypeData.material_id) {
        setMateriais(prev => prev.filter(material => material.id !== postTypeData.material_id));
      }
      
      // Sincronizar dados após mutação
      await fetchPostTypes();
    } catch (error) {
      console.error('Erro ao excluir tipo de poste:', error);
      throw error;
    }
  };

  const addPostToBudget = async (newPostData: { budget_id: string; post_type_id: string; name: string; x_coord: number; y_coord: number; skipPostTypeMaterial?: boolean; }) => {
    try {
      console.log(`🔄 === SUPABASE INSERT INICIADO ===`);
      console.log(`📤 Dados sendo enviados para Supabase:`, newPostData);
      
      // Primeiro, buscar o material_id do tipo de poste
      const { data: postTypeData, error: postTypeError } = await supabase
        .from('post_types')
        .select('material_id, price')
        .eq('id', newPostData.post_type_id)
        .single();

      if (postTypeError) {
        console.error('Erro ao buscar dados do tipo de poste:', postTypeError);
        throw postTypeError;
      }
      
      const { data, error } = await supabase
        .from('budget_posts')
        .insert({
          budget_id: newPostData.budget_id,
          post_type_id: newPostData.post_type_id,
          name: newPostData.name,
          x_coord: newPostData.x_coord,
          y_coord: newPostData.y_coord,
        })
        .select(`
          *,
          post_types (
            id,
            name,
            code,
            description,
            shape,
            height_m,
            price
          )
        `)
        .single();

      if (error) {
        console.error('Erro ao adicionar poste:', error);
        throw error;
      }

      console.log(`✅ SUPABASE INSERT SUCESSO - dados retornados:`, data);

      // Primeiro, criar o material avulso no banco de dados (se existe material_id)
      // IMPORTANTE: Só adicionar se skipPostTypeMaterial não estiver definido ou for false
      let looseMaterialData = null;
      if (postTypeData.material_id && !newPostData.skipPostTypeMaterial) {
        console.log(`🔄 === ADICIONANDO MATERIAL AVULSO ===`);
        console.log(`📝 Post ID: ${data.id}`);
        console.log(`📝 Material ID: ${postTypeData.material_id}`);
        console.log(`📝 Quantidade: 1`);
        console.log(`📝 Preço: ${postTypeData.price}`);
        
        // Verificar se já existe esse material avulso para evitar duplicação
        const { data: existingMaterial, error: checkError } = await supabase
          .from('post_materials')
          .select('id')
          .eq('post_id', data.id)
          .eq('material_id', postTypeData.material_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = row not found
          console.error('❌ Erro ao verificar material avulso existente:', checkError);
        }

        // Só adicionar se não existir
        if (!existingMaterial) {
          console.log(`🚀 Inserindo material avulso no banco...`);
          const { data: materialData, error: materialError } = await supabase
            .from('post_materials')
            .insert({
              post_id: data.id,
              material_id: postTypeData.material_id,
              quantity: 1,
              price_at_addition: postTypeData.price,
            })
            .select(`
              id,
              material_id,
              quantity,
              price_at_addition,
              materials (
                id,
                code,
                name,
                description,
                unit,
                price
              )
            `)
            .single();

          if (materialError) {
            console.error('❌ Erro ao inserir material avulso:', materialError);
          } else {
            console.log(`✅ Material avulso inserido com sucesso:`, materialData);
            looseMaterialData = materialData;
          }
        } else {
          console.log(`ℹ️ Poste já existe como material avulso, pulando...`);
        }
      } else if (newPostData.skipPostTypeMaterial) {
        console.log(`ℹ️ skipPostTypeMaterial=true - não adicionando material do tipo de poste automaticamente`);
      } else {
        console.log(`⚠️ Post type não tem material_id - não será adicionado aos materiais avulsos`);
      }

      // Mapear o novo poste para o formato dos budgetDetails (incluindo material avulso se foi criado)
      const newPostDetail: BudgetPostDetail = {
        id: data.id,
        name: data.name || '',
        x_coord: data.x_coord || 0,
        y_coord: data.y_coord || 0,
        post_types: data.post_types ? {
          id: data.post_types.id,
          name: data.post_types.name || '',
          code: data.post_types.code || undefined,
          description: data.post_types.description || undefined,
          shape: data.post_types.shape || undefined,
          height_m: data.post_types.height_m || undefined,
          price: data.post_types.price || 0
        } : null,
        post_item_groups: [], // Novo poste não tem grupos ainda
        post_materials: looseMaterialData ? [{
          id: looseMaterialData.id,
          post_id: data.id,
          material_id: looseMaterialData.material_id,
          quantity: looseMaterialData.quantity,
          price_at_addition: looseMaterialData.price_at_addition,
          materials: looseMaterialData.materials ? {
            id: (looseMaterialData.materials as any).id,
            code: (looseMaterialData.materials as any).code || '',
            name: (looseMaterialData.materials as any).name || '',
            description: (looseMaterialData.materials as any).description || undefined,
            unit: (looseMaterialData.materials as any).unit || '',
            price: (looseMaterialData.materials as any).price || 0
          } : {
            id: '',
            code: '',
            name: 'Material não encontrado',
            description: undefined,
            unit: '',
            price: 0
          }
        }] : [] // Lista vazia se não foi criado material avulso
      };

      console.log(`🎯 Novo post mapeado com material avulso:`, {
        postId: newPostDetail.id,
        postName: newPostDetail.name,
        materialsCount: newPostDetail.post_materials.length,
        materials: newPostDetail.post_materials.map(m => m.materials?.name || 'N/A')
      });

      // Adicionar o novo poste ao estado budgetDetails de forma imutável
      setBudgetDetails(prevDetails => {
        // Verificação de segurança: Se não houver um orçamento carregado,
        // não faz nada e avisa no console.
        if (!prevDetails) {
          console.error("❌ Erro Crítico: Tentativa de adicionar poste sem um orçamento completamente carregado.");
          return prevDetails;
        }

        console.log(`🔄 Atualizando estado local - posts antes:`, prevDetails.posts.length);
        
        // Lógica correta e única:
        // Retorna o objeto de orçamento anterior, com a lista de postes atualizada.
        const updatedDetails = {
          ...prevDetails,
          posts: [...prevDetails.posts, newPostDetail],
        };
        
        console.log(`✅ Estado atualizado - posts depois:`, updatedDetails.posts.length);
        console.log(`🎉 Poste adicionado com sucesso! Materiais avulsos: ${newPostDetail.post_materials.length}`);
        
        return updatedDetails;
      });

      // Retornar o ID do poste criado
      return data.id;
    } catch (error) {
      console.error('Erro ao adicionar poste:', error);
      throw error;
    }
  };

  const addGroupToPost = async (groupId: string, postId: string) => {
    try {

      
      // a. Primeiro, buscar os dados do template de grupo
      const { data: groupTemplate, error: groupError } = await supabase
        .from('item_group_templates')
        .select('id, name, description')
        .eq('id', groupId)
        .single();

      if (groupError) {
        console.error('Erro ao buscar template do grupo:', groupError);
        throw groupError;
      }



      // b. Criar novo registro na tabela post_item_groups
      const { data: newGroupInstance, error: instanceError } = await supabase
        .from('post_item_groups')
        .insert({
          budget_post_id: postId,
          template_id: groupId,
          name: groupTemplate.name,
        })
        .select('id')
        .single();

      if (instanceError) {
        console.error('Erro ao criar instância do grupo:', instanceError);
        throw instanceError;
      }



      // c. Buscar todos os materiais e suas quantidades do template
      const { data: templateMaterials, error: materialsError } = await supabase
        .from('template_materials')
        .select(`
          material_id,
          quantity,
          materials (
            id,
            code,
            name,
            description,
            unit,
            price
          )
        `)
        .eq('template_id', groupId);

      if (materialsError) {
        console.error('Erro ao buscar materiais do template:', materialsError);
        throw materialsError;
      }



      // d. Inserção em lote na tabela post_item_group_materials
      if (templateMaterials && templateMaterials.length > 0) {
        const groupMaterialsData = templateMaterials.map(templateMaterial => ({
          post_item_group_id: newGroupInstance.id,
          material_id: templateMaterial.material_id,
          quantity: templateMaterial.quantity,
          price_at_addition: (templateMaterial.materials as any)?.price || 0,
        }));

        const { error: batchInsertError } = await supabase
          .from('post_item_group_materials')
          .insert(groupMaterialsData);

        if (batchInsertError) {
          console.error('Erro ao inserir materiais do grupo:', batchInsertError);
          throw batchInsertError;
        }


      }

      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => {
            if (post.id === postId) {
              // Criar o novo grupo para adicionar ao poste
              const newGroup = {
                id: newGroupInstance.id,
                name: groupTemplate.name,
                template_id: groupId,
                post_item_group_materials: templateMaterials?.map(templateMaterial => ({
                  material_id: templateMaterial.material_id,
                  quantity: templateMaterial.quantity,
                  price_at_addition: (templateMaterial.materials as any)?.price || 0,
                  materials: (templateMaterial.materials as any) || {
                    id: '',
                    code: '',
                    name: 'Material não encontrado',
                    description: undefined,
                    unit: '',
                    price: 0
                  }
                })) || []
              };

              return {
                ...post,
                post_item_groups: [...post.post_item_groups, newGroup]
              };
            }
            return post;
          })
        };
      });

    } catch (error) {
      console.error('Erro ao adicionar grupo ao poste:', error);
      throw error;
    }
  };

  const deletePostFromBudget = async (postId: string) => {
    try {


      const { error } = await supabase
        .from('budget_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Erro ao excluir poste:', error);
        throw error;
      }



      // Atualizar o estado budgetDetails localmente removendo o poste
      setBudgetDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.filter(post => post.id !== postId)
        };
      });
    } catch (error) {
      console.error('Erro ao excluir poste:', error);
      throw error;
    }
  };

  const removeGroupFromPost = async (postGroupId: string) => {
    try {


      const { error } = await supabase
        .from('post_item_groups')
        .delete()
        .eq('id', postGroupId);

      if (error) {
        console.error('Erro ao remover grupo:', error);
        throw error;
      }



      // Atualizar o estado budgetDetails localmente removendo o grupo
      setBudgetDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map(post => ({
            ...post,
            post_item_groups: post.post_item_groups.filter(group => group.id !== postGroupId)
          }))
        };
      });
    } catch (error) {
      console.error('Erro ao remover grupo:', error);
      throw error;
    }
  };

  const updateMaterialQuantityInPostGroup = async (postGroupId: string, materialId: string, newQuantity: number) => {
    try {


      // Validar quantidade
      if (newQuantity < 0) {
        throw new Error('Quantidade não pode ser negativa');
      }

      const { error } = await supabase
        .from('post_item_group_materials')
        .update({ quantity: newQuantity })
        .eq('post_item_group_id', postGroupId)
        .eq('material_id', materialId);

      if (error) {
        console.error('Erro ao atualizar quantidade do material:', error);
        throw error;
      }



      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => ({
            ...post,
            post_item_groups: post.post_item_groups.map(group => {
              if (group.id === postGroupId) {
                return {
                  ...group,
                  post_item_group_materials: group.post_item_group_materials.map(material => {
                    if (material.material_id === materialId) {
                      return {
                        ...material,
                        quantity: newQuantity
                      };
                    }
                    return material;
                  })
                };
              }
              return group;
            })
          }))
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade do material:', error);
      throw error;
    }
  };

  // Função para adicionar material avulso ao poste (usado quando usuário adiciona manualmente)
  const addLooseMaterialToPost = async (postId: string, materialId: string, quantity: number, price: number) => {
    try {
      const { data, error } = await supabase
        .from('post_materials')
        .insert({
          post_id: postId,
          material_id: materialId,
          quantity,
          price_at_addition: price,
        })
        .select(`
          id,
          material_id,
          quantity,
          price_at_addition,
          materials (
            id,
            code,
            name,
            description,
            unit,
            price
          )
        `)
        .single();

      if (error) {
        console.error('Erro ao inserir material avulso:', error);
        throw error;
      }

      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => {
            if (post.id === postId) {
              const newLooseMaterial = {
                id: data.id,
                post_id: postId,
                material_id: data.material_id,
                quantity: data.quantity,
                price_at_addition: data.price_at_addition,
                materials: data.materials ? {
                  id: (data.materials as any).id,
                  code: (data.materials as any).code || '',
                  name: (data.materials as any).name || '',
                  description: (data.materials as any).description || undefined,
                  unit: (data.materials as any).unit || '',
                  price: (data.materials as any).price || 0
                } : {
                  id: '',
                  code: '',
                  name: 'Material não encontrado',
                  description: undefined,
                  unit: '',
                  price: 0
                }
              };

              return {
                ...post,
                post_materials: [...post.post_materials, newLooseMaterial]
              };
            }
            return post;
          })
        };
      });
    } catch (error) {
      console.error('Erro ao adicionar material avulso:', error);
      throw error;
    }
  };

  // Função para atualizar quantidade de material avulso
  const updateLooseMaterialQuantity = async (postMaterialId: string, newQuantity: number) => {
    try {


      // Validar quantidade
      if (newQuantity < 0) {
        throw new Error('Quantidade não pode ser negativa');
      }

      const { error } = await supabase
        .from('post_materials')
        .update({ quantity: newQuantity })
        .eq('id', postMaterialId);

      if (error) {
        console.error('Erro ao atualizar quantidade do material avulso:', error);
        throw error;
      }



      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => ({
            ...post,
            post_materials: post.post_materials.map(material => {
              if (material.id === postMaterialId) {
                return {
                  ...material,
                  quantity: newQuantity
                };
              }
              return material;
            })
          }))
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade do material avulso:', error);
      throw error;
    }
  };

  // Função para remover material avulso do poste
  const removeLooseMaterialFromPost = async (postMaterialId: string) => {
    try {


      const { error } = await supabase
        .from('post_materials')
        .delete()
        .eq('id', postMaterialId);

      if (error) {
        console.error('Erro ao remover material avulso:', error);
        throw error;
      }



      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => ({
            ...post,
            post_materials: post.post_materials.filter(material => material.id !== postMaterialId)
          }))
        };
      });
    } catch (error) {
      console.error('Erro ao remover material avulso:', error);
      throw error;
    }
  };

  // Função para atualizar preços consolidados de um material em todo o orçamento
  const updateConsolidatedMaterialPrice = async (budgetId: string, materialId: string, newPrice: number) => {
    try {
      // Validar preço
      if (newPrice < 0) {
        throw new Error('Preço não pode ser negativo');
      }

      // Buscar todos os postes do orçamento
      const { data: posts, error: postsError } = await supabase
        .from('budget_posts')
        .select('id')
        .eq('budget_id', budgetId)
        .range(0, 500); // Limite de 500 postes por orçamento (otimizado)

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return;

      const postIds = posts.map(p => p.id);

      // Buscar todos os IDs de post_item_groups dos postes
      const { data: postGroups, error: groupsError } = await supabase
        .from('post_item_groups')
        .select('id')
        .in('budget_post_id', postIds)
        .range(0, 2000); // Limite de 2000 grupos (500 postes x ~4 grupos média)

      if (!groupsError && postGroups && postGroups.length > 0) {
        const groupIds = postGroups.map(g => g.id);

        // Atualizar price_at_addition em post_item_group_materials
        await supabase
          .from('post_item_group_materials')
          .update({ price_at_addition: newPrice })
          .eq('material_id', materialId)
          .in('post_item_group_id', groupIds);
      }

      // Atualizar price_at_addition em post_materials (materiais avulsos)
      await supabase
        .from('post_materials')
        .update({ price_at_addition: newPrice })
        .eq('material_id', materialId)
        .in('post_id', postIds);

      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          posts: prev.posts.map(post => ({
            ...post,
            post_item_groups: post.post_item_groups.map(group => ({
              ...group,
              post_item_group_materials: group.post_item_group_materials.map(material => {
                if (material.material_id === materialId) {
                  return {
                    ...material,
                    price_at_addition: newPrice
                  };
                }
                return material;
              })
            })),
            post_materials: post.post_materials.map(material => {
              if (material.material_id === materialId) {
                return {
                  ...material,
                  price_at_addition: newPrice
                };
              }
              return material;
            })
          }))
        };
      });

      console.log('✅ Preço atualizado:', { materialId, newPrice });
    } catch (error) {
      console.error('❌ Erro ao atualizar preço:', error);
      throw error;
    }
  };

  // Funções para concessionárias
  const fetchUtilityCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);

      
      // Buscar TODAS as concessionárias usando a função helper de paginação
      const data = await fetchAllRecords('utility_companies', '*', 'name', true);



      // Mapear os dados do banco para o formato do frontend
      const concessionariasFormatadas: Concessionaria[] = data.map(item => ({
        id: item.id,
        nome: item.name || '',
        sigla: item.name || '', // Usando name como sigla até termos campo específico
      }));

      setUtilityCompanies(concessionariasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar concessionárias:', error);
      setUtilityCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const addUtilityCompany = async (data: { name: string }) => {
    try {
      const { data: newCompany, error } = await supabase
        .from('utility_companies')
        .insert({
          name: data.name.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar concessionária:', error);
        throw error;
      }

      // Mapear dados do banco para o formato do frontend e adicionar ao estado
      const newUtilityCompany: Concessionaria = {
        id: newCompany.id,
        nome: newCompany.name || '',
        sigla: newCompany.name || '',
      };

      setUtilityCompanies(prev => [...prev, newUtilityCompany].sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      console.error('Erro ao adicionar concessionária:', error);
      throw error;
    }
  };

  const updateUtilityCompany = async (id: string, data: { name: string }) => {
    try {
      const { data: updatedCompany, error } = await supabase
        .from('utility_companies')
        .update({
          name: data.name.trim(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar concessionária:', error);
        throw error;
      }

      // Mapear dados do banco para o formato do frontend e atualizar o estado
      const updatedUtilityCompany: Concessionaria = {
        id: updatedCompany.id,
        nome: updatedCompany.name || '',
        sigla: updatedCompany.name || '',
      };

      setUtilityCompanies(prev => 
        prev.map(company => company.id === id ? updatedUtilityCompany : company)
           .sort((a, b) => a.nome.localeCompare(b.nome))
      );
    } catch (error) {
      console.error('Erro ao atualizar concessionária:', error);
      throw error;
    }
  };

  const deleteUtilityCompany = async (id: string) => {
    try {
      // Primeiro, verificar se a concessionária está sendo usada em algum orçamento
      const { data: budgetsUsingCompany, error: checkError } = await supabase
        .from('budgets')
        .select('id, project_name')
        .eq('company_id', id)
        .limit(5); // Limite para não sobrecarregar se houver muitos

      if (checkError) {
        console.error('Erro ao verificar uso da concessionária:', checkError);
        throw new Error('Erro ao verificar se a concessionária está sendo utilizada.');
      }

      // Se houver orçamentos usando esta concessionária, não permitir exclusão
      if (budgetsUsingCompany && budgetsUsingCompany.length > 0) {
        const projectNames = budgetsUsingCompany.map(budget => budget.project_name).join(', ');
        const message = budgetsUsingCompany.length === 1 
          ? `Esta concessionária não pode ser excluída pois está sendo utilizada no orçamento: ${projectNames}`
          : `Esta concessionária não pode ser excluída pois está sendo utilizada em ${budgetsUsingCompany.length} orçamentos: ${projectNames}${budgetsUsingCompany.length > 5 ? ' e outros...' : ''}`;
        
        throw new Error(message);
      }

      // Se não houver orçamentos usando, prosseguir com a exclusão
      const { error } = await supabase
        .from('utility_companies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir concessionária:', error);
        throw new Error('Erro ao excluir concessionária do banco de dados.');
      }

      // Remover do estado local
      setUtilityCompanies(prev => prev.filter(company => company.id !== id));
    } catch (error) {
      console.error('Erro ao excluir concessionária:', error);
      throw error; // Re-throw para que o componente possa capturar a mensagem específica
    }
  };

  // Funções para grupos de itens
  const fetchItemGroups = useCallback(async (companyId: string) => {
    try {
      setLoadingGroups(true);

      
      // Buscar templates de grupos para a empresa
      const { data: templatesData, error: templatesError, count } = await supabase
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
        `, { count: 'exact' })
        .eq('company_id', companyId)
        .range(0, 200); // Limite de 200 grupos por concessionária (otimizado)

      if (templatesError) {
        console.error('Erro ao buscar templates de grupos:', templatesError);
        throw templatesError;
      }



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



      // Deletar todos os materiais existentes para este grupo
      const { error: deleteError } = await supabase
        .from('template_materials')
        .delete()
        .eq('template_id', groupId);

      if (deleteError) {
        console.error('Erro ao deletar materiais existentes:', deleteError);
        throw deleteError;
      }



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


      // A configuração ON DELETE CASCADE cuidará dos materiais automaticamente
      const { error } = await supabase
        .from('item_group_templates')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Erro ao excluir grupo:', error);
        throw error;
      }



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

  // Função centralizada para buscar todos os dados essenciais
  const fetchAllCoreData = useCallback(async () => {
    console.log("🔄 Sincronizando todos os dados com o banco de dados...");
    setLoading(true);
    try {
      // Buscar dados de catálogo em paralelo
      await Promise.all([
        fetchBudgets(),
        fetchMaterials(),
        fetchPostTypes(),
        fetchUtilityCompanies(),
      ]);

      console.log("✅ Sincronização completa dos dados essenciais concluída");
    } catch (error) {
      console.error("❌ Falha ao sincronizar dados essenciais:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets, fetchMaterials, fetchPostTypes, fetchUtilityCompanies]);

  // Se não estiver inicializado ainda, mostra loading
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Inicializando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      materiais,
      gruposItens,
      concessionarias,
      orcamentos,
      budgets,
      budgetDetails,
      postTypes,
      currentOrcamento,
      currentView,
      loadingMaterials,
      loadingBudgets,
      loadingBudgetDetails,
      loadingPostTypes,
      loadingUpload,
      loading,
      
      // Novos estados para gerenciar grupos
      utilityCompanies,
      itemGroups,
      loadingCompanies,
      loadingGroups,
      currentGroup,
      
      setCurrentView,
      setCurrentOrcamento,
      setCurrentGroup,
      
      // Funções de sincronização
      fetchAllCoreData,
      
      // Funções de materiais
      fetchMaterials,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      deleteAllMaterials,
      importMaterialsFromCSV,
      
      // Funções de orçamentos
      fetchBudgets,
      addBudget,
      updateBudget,
      deleteBudget,
      duplicateBudget,
      finalizeBudget,
      fetchBudgetDetails,
      uploadPlanImage,
      deletePlanImage,
      
      // Funções de tipos de poste
      fetchPostTypes,
      addPostToBudget,
      addGroupToPost,
      deletePostFromBudget,
      removeGroupFromPost,
      updateMaterialQuantityInPostGroup,
      
      // Funções para materiais avulsos
      addLooseMaterialToPost,
      updateLooseMaterialQuantity,
      removeLooseMaterialFromPost,
      
      // Função para atualizar preços consolidados
      updateConsolidatedMaterialPrice,
      
      // Funções para concessionárias e grupos
      fetchUtilityCompanies,
      addUtilityCompany,
      updateUtilityCompany,
      deleteUtilityCompany,
      fetchItemGroups,
      addGroup,
      updateGroup,
      deleteGroup,
      
      // Funções para tipos de poste
      addPostType,
      updatePostType,
      deletePostType,
      
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
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Material, GrupoItem, Concessionaria, Orcamento, BudgetPostDetail, PostType } from '../types';
import { gruposItens as initialGrupos, concessionarias, orcamentos as initialOrcamentos } from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface AppContextType {
  materiais: Material[];
  gruposItens: GrupoItem[];
  concessionarias: Concessionaria[];
  orcamentos: Orcamento[];
  budgets: Orcamento[];
  budgetDetails: BudgetPostDetail[] | null;
  postTypes: PostType[];
  currentOrcamento: Orcamento | null;
  currentView: string;
  loadingMaterials: boolean;
  loadingBudgets: boolean;
  loadingBudgetDetails: boolean;
  loadingPostTypes: boolean;
  loadingUpload: boolean;
  
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
  
  // Funções de orçamentos
  fetchBudgets: () => Promise<void>;
  addBudget: (budgetData: { project_name: string; client_name?: string; city?: string; company_id: string; }) => Promise<void>;
  fetchBudgetDetails: (budgetId: string) => Promise<void>;
  uploadPlanImage: (budgetId: string, file: File) => Promise<void>;
  deletePlanImage: (budgetId: string) => Promise<void>;
  
  // Funções de tipos de poste
  fetchPostTypes: () => Promise<void>;
  addPostToBudget: (newPostData: { budget_id: string; post_type_id: string; name: string; x_coord: number; y_coord: number; }) => Promise<void>;
  addGroupToPost: (groupId: string, postId: string) => Promise<void>;
  deletePostFromBudget: (postId: string) => Promise<void>;
  removeGroupFromPost: (postGroupId: string) => Promise<void>;
  updateMaterialQuantityInPostGroup: (postGroupId: string, materialId: string, newQuantity: number) => Promise<void>;
  
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
  const { user } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [gruposItens, setGruposItens] = useState<GrupoItem[]>(initialGrupos);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(initialOrcamentos);
  const [budgets, setBudgets] = useState<Orcamento[]>([]);
  const [budgetDetails, setBudgetDetails] = useState<BudgetPostDetail[] | null>(null);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [currentOrcamento, setCurrentOrcamento] = useState<Orcamento | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingBudgets, setLoadingBudgets] = useState<boolean>(false);
  const [loadingBudgetDetails, setLoadingBudgetDetails] = useState<boolean>(false);
  const [loadingPostTypes, setLoadingPostTypes] = useState<boolean>(false);
  const [loadingUpload, setLoadingUpload] = useState<boolean>(false);
  
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

  // Funções para orçamentos
  const fetchBudgets = useCallback(async () => {
    if (!user) {
      console.log('Usuário não autenticado, não é possível buscar orçamentos');
      return;
    }

    try {
      setLoadingBudgets(true);
      console.log('Buscando orçamentos do Supabase...');
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*, plan_image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[DEBUG] Dados brutos do banco (budgets):', data);

      if (error) {
        console.error('Erro ao buscar orçamentos:', error);
        throw error;
      }

      console.log('Orçamentos encontrados:', data);
      console.log('[DEBUG] Primeiro orçamento com company_id:', data?.[0]?.company_id);

      // Mapear os dados do banco para o formato do frontend
      const orcamentosFormatados: Orcamento[] = data?.map(item => ({
        id: item.id,
        nome: item.project_name || '',
        concessionariaId: item.company_id || '', // Usar company_id do banco
        company_id: item.company_id, // ID da empresa no Supabase
        dataModificacao: item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : '',
        status: item.status as 'Em Andamento' | 'Finalizado',
        postes: [], // Será implementado quando conectarmos os postes
        ...(item.client_name && { clientName: item.client_name }),
        ...(item.city && { city: item.city }),
        ...(item.plan_image_url && { imagemPlanta: item.plan_image_url }),
      })) || [];

      console.log('[DEBUG] Orçamentos formatados com company_id:', orcamentosFormatados.map(o => ({ id: o.id, nome: o.nome, company_id: o.company_id })));

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
      console.log('Usuário não autenticado, não é possível criar orçamento');
      return;
    }

    try {
      console.log('Adicionando orçamento:', budgetData);
      
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

      console.log('[DEBUG] Orçamento adicionado com sucesso (dados do banco):', data);

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

      console.log('[DEBUG] Novo orçamento formatado:', newBudget);

      setBudgets(prev => [newBudget, ...prev]);
      
      // Definir como orçamento atual e mudar para a área de trabalho
      console.log('[DEBUG] Definindo currentOrcamento com company_id:', newBudget.company_id);
      setCurrentOrcamento(newBudget);
      setCurrentView('orcamento');
    } catch (error) {
      console.error('Erro ao adicionar orçamento:', error);
      throw error;
    }
  };

  const uploadPlanImage = async (budgetId: string, file: File) => {
    if (!user) {
      console.log('Usuário não autenticado, não é possível fazer upload');
      return;
    }

    try {
      setLoadingUpload(true);
      console.log('Fazendo upload da imagem da planta:', file.name);

      // a. Gerar um caminho de arquivo único para evitar conflitos
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `public/budgets/${budgetId}/${timestamp}_${sanitizedFileName}`;

      // b. Fazer o upload do arquivo para o bucket 'plans'
      let uploadData;
      
      const { data: initialUploadData, error: uploadError } = await supabase.storage
        .from('plans')
        .upload(filePath, file);

      if (uploadError) {
        // Se o bucket não existir, tentar criá-lo
        if (uploadError.message?.includes('Bucket not found')) {
          console.log('Bucket "plans" não existe, criando...');
          
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

          console.log('Bucket "plans" criado com sucesso');
          
          // Tentar fazer upload novamente
          const { data: retryUploadData, error: retryUploadError } = await supabase.storage
            .from('plans')
            .upload(filePath, file);

          if (retryUploadError) {
            console.error('Erro ao fazer upload do arquivo após criar bucket:', retryUploadError);
            throw retryUploadError;
          }

          uploadData = retryUploadData;
        } else {
          console.error('Erro ao fazer upload do arquivo:', uploadError);
          throw uploadError;
        }
      } else {
        uploadData = initialUploadData;
      }

      console.log('Upload realizado com sucesso:', uploadData);

      // c. Obter a URL pública do arquivo
      const { data: publicUrlData } = supabase.storage
        .from('plans')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      console.log('URL pública gerada:', publicUrl);

      // d. Atualizar a tabela budgets, salvando a publicUrl na coluna plan_image_url
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ plan_image_url: publicUrl })
        .eq('id', budgetId);

      if (updateError) {
        console.error('Erro ao atualizar orçamento com URL da imagem:', updateError);
        throw updateError;
      }

      console.log('Orçamento atualizado com URL da imagem');

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
      console.log('Usuário não autenticado, não é possível deletar imagem');
      return;
    }

    try {
      setLoadingUpload(true);
      console.log('Deletando imagem da planta do orçamento:', budgetId);

      // Atualizar a tabela budgets, removendo a URL da imagem
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ plan_image_url: null })
        .eq('id', budgetId);

      if (updateError) {
        console.error('Erro ao remover URL da imagem do orçamento:', updateError);
        throw updateError;
      }

      console.log('URL da imagem removida do orçamento');

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
      console.log('Buscando detalhes do orçamento:', budgetId);
      
      // Query aninhada para buscar todos os dados relacionados ao orçamento
      const { data, error } = await supabase
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
          )
        `)
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar detalhes do orçamento:', error);
        throw error;
      }

      console.log('[DEBUG] fetchBudgetDetails - Dados brutos retornados:', JSON.stringify(data, null, 2));

      // Mapear os dados para o tipo correto
      const budgetDetailsFormatted: BudgetPostDetail[] = data?.map(post => ({
        id: post.id,
        name: post.name || '',
        x_coord: post.x_coord || 0,
        y_coord: post.y_coord || 0,
        post_types: post.post_types ? {
          id: post.post_types.id,
          name: post.post_types.name || '',
          code: post.post_types.code || undefined,
          description: post.post_types.description || undefined,
          shape: post.post_types.shape || undefined,
          height_m: post.post_types.height_m || undefined,
          price: post.post_types.price || 0
        } : null,
        post_item_groups: post.post_item_groups?.map(group => ({
          id: group.id,
          name: group.name || '',
          template_id: group.template_id || undefined,
          post_item_group_materials: group.post_item_group_materials?.map(material => {
            if (!material.materials) {
              console.error('[DEBUG] Material sem dados aninhados:', material);
            }
            
            return {
              material_id: material.material_id,
              quantity: material.quantity || 0,
              price_at_addition: material.price_at_addition || 0,
              materials: material.materials ? {
                id: material.materials.id,
                code: material.materials.code || '',
                name: material.materials.name || '',
                description: material.materials.description || undefined,
                unit: material.materials.unit || '',
                price: material.materials.price || 0
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
        })) || []
      })) || [];

      setBudgetDetails(budgetDetailsFormatted);
    } catch (error) {
      console.error('Erro ao buscar detalhes do orçamento:', error);
      setBudgetDetails(null);
    } finally {
      setLoadingBudgetDetails(false);
    }
  }, []);

  const fetchPostTypes = useCallback(async () => {
    try {
      setLoadingPostTypes(true);
      console.log('Buscando tipos de poste do Supabase...');
      
      const { data, error } = await supabase
        .from('post_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tipos de poste:', error);
        throw error;
      }

      console.log('Tipos de poste encontrados:', data);

      // Mapear os dados do banco para o formato do frontend
      const postTypesFormatted: PostType[] = data?.map(item => ({
        id: item.id,
        name: item.name || '',
        code: item.code || undefined,
        description: item.description || undefined,
        shape: item.shape || undefined,
        height_m: item.height_m || undefined,
        price: parseFloat(item.price) || 0,
      })) || [];

      setPostTypes(postTypesFormatted);
    } catch (error) {
      console.error('Erro ao buscar tipos de poste:', error);
      setPostTypes([]);
    } finally {
      setLoadingPostTypes(false);
    }
  }, []);

  const addPostToBudget = async (newPostData: { budget_id: string; post_type_id: string; name: string; x_coord: number; y_coord: number; }) => {
    try {
      console.log('Adicionando poste ao orçamento:', newPostData);
      
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

      console.log('Poste adicionado com sucesso:', data);

      // Mapear o novo poste para o formato dos budgetDetails
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
        post_item_groups: [] // Novo poste não tem grupos ainda
      };

      // Adicionar o novo poste ao estado budgetDetails
      setBudgetDetails(prev => prev ? [...prev, newPostDetail] : [newPostDetail]);
    } catch (error) {
      console.error('Erro ao adicionar poste:', error);
      throw error;
    }
  };

  const addGroupToPost = async (groupId: string, postId: string) => {
    try {
      console.log('Adicionando grupo ao poste:', { groupId, postId });
      
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

      console.log('Template do grupo encontrado:', groupTemplate);

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

      console.log('Instância do grupo criada:', newGroupInstance);

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

      console.log('Materiais do template encontrados:', templateMaterials);

      // d. Inserção em lote na tabela post_item_group_materials
      if (templateMaterials && templateMaterials.length > 0) {
        const groupMaterialsData = templateMaterials.map(templateMaterial => ({
          post_item_group_id: newGroupInstance.id,
          material_id: templateMaterial.material_id,
          quantity: templateMaterial.quantity,
          price_at_addition: Array.isArray(templateMaterial.materials) && templateMaterial.materials[0] 
            ? templateMaterial.materials[0].price 
            : 0,
        }));

        const { error: batchInsertError } = await supabase
          .from('post_item_group_materials')
          .insert(groupMaterialsData);

        if (batchInsertError) {
          console.error('Erro ao inserir materiais do grupo:', batchInsertError);
          throw batchInsertError;
        }

        console.log('Materiais do grupo inseridos com sucesso');
      }

      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return prev.map(post => {
          if (post.id === postId) {
            // Criar o novo grupo para adicionar ao poste
            const newGroup = {
              id: newGroupInstance.id,
              name: groupTemplate.name,
              template_id: groupId,
              post_item_group_materials: templateMaterials?.map(templateMaterial => ({
                material_id: templateMaterial.material_id,
                quantity: templateMaterial.quantity,
                price_at_addition: Array.isArray(templateMaterial.materials) && templateMaterial.materials[0]
                  ? templateMaterial.materials[0].price
                  : 0,
                materials: Array.isArray(templateMaterial.materials) && templateMaterial.materials[0]
                  ? templateMaterial.materials[0]
                  : {
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
        });
      });

    } catch (error) {
      console.error('Erro ao adicionar grupo ao poste:', error);
      throw error;
    }
  };

  const deletePostFromBudget = async (postId: string) => {
    try {
      console.log('Excluindo poste do orçamento:', postId);

      const { error } = await supabase
        .from('budget_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Erro ao excluir poste:', error);
        throw error;
      }

      console.log('Poste excluído com sucesso:', postId);

      // Atualizar o estado budgetDetails localmente removendo o poste
      setBudgetDetails(prev => {
        if (!prev) return prev;
        return prev.filter(post => post.id !== postId);
      });
    } catch (error) {
      console.error('Erro ao excluir poste:', error);
      throw error;
    }
  };

  const removeGroupFromPost = async (postGroupId: string) => {
    try {
      console.log('Removendo grupo do poste:', postGroupId);

      const { error } = await supabase
        .from('post_item_groups')
        .delete()
        .eq('id', postGroupId);

      if (error) {
        console.error('Erro ao remover grupo:', error);
        throw error;
      }

      console.log('Grupo removido com sucesso:', postGroupId);

      // Atualizar o estado budgetDetails localmente removendo o grupo
      setBudgetDetails(prev => {
        if (!prev) return prev;
        return prev.map(post => ({
          ...post,
          post_item_groups: post.post_item_groups.filter(group => group.id !== postGroupId)
        }));
      });
    } catch (error) {
      console.error('Erro ao remover grupo:', error);
      throw error;
    }
  };

  const updateMaterialQuantityInPostGroup = async (postGroupId: string, materialId: string, newQuantity: number) => {
    try {
      console.log('Atualizando quantidade de material:', { postGroupId, materialId, newQuantity });

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

      console.log('Quantidade do material atualizada com sucesso');

      // Atualizar o estado budgetDetails localmente
      setBudgetDetails(prev => {
        if (!prev) return prev;

        return prev.map(post => ({
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
        }));
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade do material:', error);
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
      console.log('[DEBUG] Buscando grupos para a concessionária ID:', companyId);
      
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

      console.log('[DEBUG] Grupos encontrados no banco:', templatesData);

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

      console.log('[DEBUG] Grupos formatados para o estado:', gruposFormatados);
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
      
      // Funções de orçamentos
      fetchBudgets,
      addBudget,
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
export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  precoUnit: number;
  unidade: string;
}

export interface GrupoItem {
  id: string;
  nome: string;
  descricao: string;
  concessionariaId: string;
  materiais: {
    materialId: string;
    quantidade: number;
  }[];
}

export interface Concessionaria {
  id: string;
  nome: string;
  sigla: string;
}

export type TipoPoste = '600mm' | '1000mm' | '1500mm' | '2000mm';
export type TipoFixacao = 'Direto' | 'Cruzeta' | 'Suporte' | 'Outro';

export interface Poste {
  id: string;
  nome: string;
  tipo: TipoPoste;
  tipoFixacao?: TipoFixacao;
  x: number;
  y: number;
  gruposItens: string[];
  concluido: boolean;
}

export interface Orcamento {
  id: string;
  nome: string;
  concessionariaId: string;
  company_id?: string; // ID da empresa no Supabase
  dataModificacao: string;
  status: 'Em Andamento' | 'Finalizado';
  imagemPlanta?: string;
  postes: Poste[];
  clientName?: string;
  city?: string;
}

export interface MaterialConsolidado {
  material: Material;
  quantidade: number;
  precoTotal: number;
}

// Tipos para catálogo de tipos de poste
export interface PostType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  shape?: string;
  height_m?: number;
  price: number;
}

// Tipos para dados detalhados do banco de dados
export interface BudgetPostDetail {
  id: string;
  name: string;
  x_coord: number;
  y_coord: number;
  post_types: {
    id: string;
    name: string;
    code?: string;
    description?: string;
    shape?: string;
    height_m?: number;
    price: number;
  } | null;
  post_item_groups: PostItemGroupDetail[];
}

export interface PostItemGroupDetail {
  id: string;
  name: string;
  template_id?: string;
  post_item_group_materials: PostItemGroupMaterial[];
}

export interface PostItemGroupMaterial {
  material_id: string;
  quantity: number;
  price_at_addition: number;
  materials: {
    id: string;
    code: string;
    name: string;
    description?: string;
    unit: string;
    price: number;
  };
}

// Tipo unificado para dados detalhados do orçamento com postes
export interface BudgetDetails {
  id: string;
  name: string;
  company_id?: string;
  client_name?: string;
  city?: string;
  status?: 'Em Andamento' | 'Finalizado';
  created_at?: string;
  updated_at?: string;
  plan_image_url?: string;
  posts: BudgetPostDetail[];
}
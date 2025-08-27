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
  dataModificacao: string;
  status: 'Em Andamento' | 'Finalizado';
  imagemPlanta?: string;
  postes: Poste[];
}

export interface MaterialConsolidado {
  material: Material;
  quantidade: number;
  precoTotal: number;
}
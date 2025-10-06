import * as XLSX from 'xlsx';

export interface MaterialExport {
  materialId: string;
  codigo: string;
  nome: string;
  unidade: string;
  precoUnit: number;
  quantidade: number;
  subtotal: number;
}

export interface ExportOptions {
  budgetName: string;
  totalCost: number;
  totalPosts: number;
  totalUniqueMaterials: number;
  exportDate: string;
}

/**
 * Exporta os materiais consolidados para formato Excel (.xlsx)
 */
export const exportToExcel = (
  materiais: MaterialExport[],
  options: ExportOptions
): void => {
  // Criar planilha de materiais
  const materialsData = materiais.map(material => ({
    'Código': material.codigo || '-',
    'Material': material.nome,
    'Unidade': material.unidade || '-',
    'Quantidade Total': material.quantidade,
    'Preço Unitário (R$)': material.precoUnit.toFixed(2),
    'Subtotal (R$)': material.subtotal.toFixed(2),
  }));

  // Adicionar linha de total
  materialsData.push({
    'Código': '',
    'Material': 'TOTAL',
    'Unidade': '',
    'Quantidade Total': '',
    'Preço Unitário (R$)': '',
    'Subtotal (R$)': options.totalCost.toFixed(2),
  } as any);

  // Criar informações do orçamento
  const infoData = [
    ['Orçamento', options.budgetName],
    ['Data de Exportação', options.exportDate],
    ['Total de Postes', options.totalPosts],
    ['Materiais Únicos', options.totalUniqueMaterials],
    ['Custo Total', `R$ ${options.totalCost.toFixed(2)}`],
  ];

  // Criar workbook
  const workbook = XLSX.utils.book_new();

  // Adicionar aba de materiais
  const materialsWorksheet = XLSX.utils.json_to_sheet(materialsData);
  
  // Definir larguras das colunas
  materialsWorksheet['!cols'] = [
    { wch: 15 }, // Código
    { wch: 40 }, // Material
    { wch: 10 }, // Unidade
    { wch: 15 }, // Quantidade
    { wch: 18 }, // Preço Unitário
    { wch: 18 }, // Subtotal
  ];

  XLSX.utils.book_append_sheet(workbook, materialsWorksheet, 'Materiais');

  // Adicionar aba de informações
  const infoWorksheet = XLSX.utils.aoa_to_sheet(infoData);
  infoWorksheet['!cols'] = [
    { wch: 25 }, // Rótulo
    { wch: 40 }, // Valor
  ];
  XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'Informações');

  // Gerar arquivo e fazer download
  const fileName = `${sanitizeFileName(options.budgetName)}_materiais_${formatDateForFileName(new Date())}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta os materiais consolidados para formato CSV
 */
export const exportToCSV = (
  materiais: MaterialExport[],
  options: ExportOptions
): void => {
  // Criar cabeçalhos
  const headers = [
    'Código',
    'Material',
    'Unidade',
    'Quantidade Total',
    'Preço Unitário (R$)',
    'Subtotal (R$)',
  ];

  // Criar linhas de dados
  const rows = materiais.map(material => [
    material.codigo || '-',
    material.nome,
    material.unidade || '-',
    material.quantidade.toString(),
    material.precoUnit.toFixed(2),
    material.subtotal.toFixed(2),
  ]);

  // Adicionar linha vazia e linha de total
  rows.push(['', '', '', '', '', '']);
  rows.push(['', 'TOTAL', '', '', '', options.totalCost.toFixed(2)]);

  // Adicionar seção de informações
  rows.push(['', '', '', '', '', '']);
  rows.push(['Informações do Orçamento', '', '', '', '', '']);
  rows.push(['Orçamento', options.budgetName, '', '', '', '']);
  rows.push(['Data de Exportação', options.exportDate, '', '', '', '']);
  rows.push(['Total de Postes', options.totalPosts.toString(), '', '', '', '']);
  rows.push(['Materiais Únicos', options.totalUniqueMaterials.toString(), '', '', '', '']);
  rows.push(['Custo Total', `R$ ${options.totalCost.toFixed(2)}`, '', '', '', '']);

  // Criar conteúdo CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Criar blob e fazer download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const fileName = `${sanitizeFileName(options.budgetName)}_materiais_${formatDateForFileName(new Date())}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 */
const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // Substituir caracteres inválidos
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .substring(0, 100); // Limitar comprimento
};

/**
 * Formata data para nome de arquivo (YYYYMMDD_HHMMSS)
 */
const formatDateForFileName = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};


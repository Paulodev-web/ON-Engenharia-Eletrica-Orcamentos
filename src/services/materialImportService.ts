import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

/**
 * Interface para o resultado do processamento do arquivo de materiais (Excel)
 */
export interface ProcessCSVResult {
  success: boolean;
  data?: any[];
  message: string;
  stats?: {
    totalProcessed: number;
    totalInserted: number;
    totalSkipped: number;
    totalFailed: number;
  };
}

/**
 * Sanitiza o texto removendo caracteres inválidos e normalizando
 * @param text - Texto a ser sanitizado
 * @returns Texto limpo
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Remove múltiplos espaços
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
    .normalize('NFC'); // Normaliza caracteres Unicode
}

/**
 * Processa um arquivo Excel (.xlsx) de materiais e retorna os dados formatados
 * @param file - Arquivo Excel a ser processado
 * @returns Promise com o resultado do processamento
 */
export async function processMaterialCSV(file: File): Promise<ProcessCSVResult> {
  try {
    // Lê o arquivo como ArrayBuffer
    const data = await file.arrayBuffer();
    
    // Parse do Workbook
    const workbook = XLSX.read(data);
    
    // Acessa à primeira planilha
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    // Converte a planilha para array de arrays
    const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<any[]>;
    
    if (!allRows || allRows.length === 0) {
      return { 
        success: false, 
        message: 'Planilha vazia ou em formato inválido.' 
      };
    }

    console.log("🔍 Primeiras linhas do Excel:", allRows.slice(0, 10));
    console.log(`📄 Total de linhas lidas do Excel: ${allRows.length}`);

    // Usar Map para evitar duplicados durante o processamento
    const materialsMap = new Map<string, any>();
    let validRowsCount = 0;
    let skippedRowsCount = 0;
    const skippedRows: any[] = [];

    // Iteramos sobre TODAS as linhas, começando do índice 1 para pular apenas o cabeçalho
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      
      // Validação robusta de cada linha
      if (!row || row.length < 2) {
        skippedRowsCount++;
        skippedRows.push({ linha: i + 1, motivo: 'Linha vazia ou com menos de 2 colunas', dados: row });
        continue; // Pula linhas vazias ou malformadas
      }

      const internalCode = row[0];
      const description = row[1];

      // Verifica se os campos essenciais existem e não são apenas espaços em branco
      // Temporariamente removido o isFinite para debug
      if (internalCode && description && String(description).trim()) {
        const cleanCode = String(internalCode).trim();

        if (!materialsMap.has(cleanCode)) {
          const cleanDescription = sanitizeText(String(description));

          materialsMap.set(cleanCode, {
            code: cleanCode,
            name: cleanDescription,
            description: cleanDescription,
            price: 0,
            unit: 'un',
          });
          validRowsCount++;
        } else {
          skippedRowsCount++;
          skippedRows.push({ linha: i + 1, motivo: 'Código duplicado', codigo: cleanCode });
        }
      } else {
        skippedRowsCount++;
        skippedRows.push({ linha: i + 1, motivo: 'Campos inválidos', codigo: internalCode, descricao: description });
      }
    }

    console.log("Total linhas:", allRows.length);
    console.log("Linhas válidas pós filtro:", materialsMap.size);
    console.log(`✅ Linhas válidas processadas: ${validRowsCount}`);
    console.log(`⚠️ Linhas ignoradas (cabeçalhos/duplicados/inválidas): ${skippedRowsCount}`);
    
    if (skippedRows.length > 0) {
      console.log("📋 Linhas ignoradas (primeiras 20):", skippedRows.slice(0, 20));
    }

    const materialsToUpsert = Array.from(materialsMap.values());

    if (materialsToUpsert.length === 0) {
      return { 
        success: false, 
        message: 'Nenhum material válido encontrado. Verifique se a planilha possui códigos numéricos na coluna A e descrições na coluna B.' 
      };
    }

    return {
      success: true,
      data: materialsToUpsert,
      message: `${materialsToUpsert.length} materiais únicos processados com sucesso.`
    };

  } catch (error: any) {
    console.error('Erro no processamento do Excel:', error);
    return { 
      success: false, 
      message: `Falha no processamento: ${error.message}` 
    };
  }
}

/**
 * Envia um lote de materiais para a função do Supabase
 * @param materials - Um array de objetos de material (um lote)
 * @returns O resultado da chamada da função
 */
async function sendBatchToSupabase(materials: any[]) {
  // Chama a função RPC 'import_materials_ignore_duplicates' no Supabase
  const { data, error } = await supabase.rpc('import_materials_ignore_duplicates', {
    materials_data: materials,
  });

  if (error) {
    console.error('Erro no lote:', error);
    throw new Error(`Falha ao processar um lote: ${error.message}`);
  }

  return data;
}

/**
 * Processa um arquivo Excel (.xlsx) de materiais e os envia em lotes para o Supabase
 * @param file - Arquivo Excel a ser processado
 * @returns Promise com o resultado final do processamento
 */
export async function processAndUploadMaterials(file: File): Promise<ProcessCSVResult> {
  // Passo 1: Processar o Excel para extrair e limpar os dados
  let allMaterials: any[];
  
  try {
    // Lê o arquivo como ArrayBuffer
    const data = await file.arrayBuffer();
    
    // Parse do Workbook
    const workbook = XLSX.read(data);
    
    // Acessa à primeira planilha
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    // Converte a planilha para array de arrays
    const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<any[]>;
    
    if (!allRows || allRows.length === 0) {
      return {
        success: false,
        message: 'Planilha vazia ou em formato inválido.',
      };
    }
    
    console.log("🔍 Primeiras linhas do Excel:", allRows.slice(0, 10));
    console.log(`📄 Total de linhas lidas do Excel: ${allRows.length}`);
    
    // Usar Map para evitar duplicados durante o processamento
    const materialsMap = new Map<string, any>();
    let validRowsCount = 0;
    let skippedRowsCount = 0;
    const skippedRows: any[] = [];

    // Iteramos sobre TODAS as linhas, começando do índice 1 para pular apenas o cabeçalho
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      
      // Validação robusta de cada linha
      if (!row || row.length < 2) {
        skippedRowsCount++;
        skippedRows.push({ linha: i + 1, motivo: 'Linha vazia ou com menos de 2 colunas', dados: row });
        continue; // Pula linhas vazias ou malformadas
      }

      const internalCode = row[0];
      const description = row[1];

      // Verifica se os campos essenciais existem e não são apenas espaços em branco
      // Temporariamente removido o isFinite para debug
      if (internalCode && description && String(description).trim()) {
        const cleanCode = String(internalCode).trim();

        if (!materialsMap.has(cleanCode)) {
          const cleanDescription = sanitizeText(String(description));

          materialsMap.set(cleanCode, {
            code: cleanCode,
            name: cleanDescription,
            description: cleanDescription,
            price: 0,
            unit: 'un',
          });
          validRowsCount++;
        } else {
          skippedRowsCount++;
          skippedRows.push({ linha: i + 1, motivo: 'Código duplicado', codigo: cleanCode });
        }
      } else {
        skippedRowsCount++;
        skippedRows.push({ linha: i + 1, motivo: 'Campos inválidos', codigo: internalCode, descricao: description });
      }
    }
    
    console.log("Total linhas:", allRows.length);
    console.log("Linhas válidas pós filtro:", materialsMap.size);
    console.log(`✅ Linhas válidas processadas: ${validRowsCount}`);
    console.log(`⚠️ Linhas ignoradas (cabeçalhos/duplicados/inválidas): ${skippedRowsCount}`);
    
    if (skippedRows.length > 0) {
      console.log("📋 Linhas ignoradas (primeiras 20):", skippedRows.slice(0, 20));
    }
    
    allMaterials = Array.from(materialsMap.values());
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao processar o Excel: ${error.message}`,
    };
  }

  if (allMaterials.length === 0) {
    return {
      success: false,
      message: 'Nenhum material válido encontrado. Verifique se a planilha possui dados nas colunas A (código) e B (descrição) a partir da linha 3.',
    };
  }

  // Passo 2: Enviar todos os materiais em lotes
  const BATCH_SIZE = 200; // Tamanho do lote. Ajuste se necessário.
  let totalInserted = 0;
  let totalSkipped = 0;
  
  // Auditoria dos lotes enviados
  const sentBatches: Array<{ batchNumber: number; codes: string[]; result: any; dbVerification?: any }> = [];
  
  console.log(`📦 Enviando ${allMaterials.length} materiais em lotes de ${BATCH_SIZE}...`);

  try {
    // 🧪 DEBUG: Para testar apenas os primeiros 2 lotes, substitua a linha abaixo por:
    // for (let i = 0; i < Math.min(allMaterials.length, BATCH_SIZE * 2); i += BATCH_SIZE) {
    for (let i = 0; i < allMaterials.length; i += BATCH_SIZE) {
      const batch = allMaterials.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allMaterials.length / BATCH_SIZE);
      
      // Log detalhado dos códigos do lote
      const batchCodes = batch.map(m => m.code);
      
      console.log(`📤 Enviando lote ${batchNumber}/${totalBatches} (${batch.length} itens)`);
      console.log(`📤 Primeiros 5 códigos do lote ${batchNumber}:`, batchCodes.slice(0, 5));
      console.log(`📤 Últimos 5 códigos do lote ${batchNumber}:`, batchCodes.slice(-5));
      
      try {
        const result = await sendBatchToSupabase(batch);
        console.log(`➡️ Resultado RPC lote ${batchNumber}:`, result);
        
        // A função do Supabase retorna { inserted: x, skipped: y, total: z }
        if (result) {
          totalInserted += result.inserted || 0;
          totalSkipped += result.skipped || 0;
          console.log(`✅ Lote ${batchNumber}: ${result.inserted || 0} inseridos, ${result.skipped || 0} ignorados`);
        }
        
        // --- VERIFICAÇÃO IMEDIATA NO DB ---
        try {
          const { data: found, error: findError } = await supabase
            .from('materials')
            .select('code')
            .in('code', batchCodes)
            .limit(1000);

          if (findError) {
            console.error(`❌ Erro ao verificar lote ${batchNumber} no DB:`, findError);
          } else {
            const foundCodes = (found || []).map(f => String(f.code));
            const missing = batchCodes.filter(c => !foundCodes.includes(String(c)));
            const dbVerification = {
              found: foundCodes.length,
              sent: batchCodes.length,
              missing: missing.length,
              missingExamples: missing.slice(0, 10)
            };
            
            console.log(`🔎 Verificação DB lote ${batchNumber}: encontrados ${foundCodes.length} / enviados ${batchCodes.length}`);
            if (missing.length > 0) {
              console.warn(`⚠️ ${missing.length} códigos NÃO encontrados no DB! Exemplos:`, missing.slice(0, 10));
            }
            
            // Salva auditoria
            sentBatches.push({ batchNumber, codes: batchCodes, result, dbVerification });
          }
        } catch (dbError: any) {
          console.error(`❌ Erro na verificação DB do lote ${batchNumber}:`, dbError);
          sentBatches.push({ batchNumber, codes: batchCodes, result });
        }
        
      } catch (error: any) {
        console.error(`❌ Falha detectada no Lote #${batchNumber}:`, error.message);
        console.log(`📋 Dados do Lote #${batchNumber} que falhou:`, batch);
        
        // Salva auditoria da falha
        sentBatches.push({ batchNumber, codes: batchCodes, result: { error: error.message } });
        
        // Re-lançar o erro para ser capturado pelo try...catch externo
        throw error;
      }
    }
    
    // Log final de auditoria
    console.log('📊 AUDITORIA COMPLETA DOS LOTES:');
    console.log(`Total de lotes enviados: ${sentBatches.length}`);
    
    const batchesWithMissing = sentBatches.filter(b => b.dbVerification && b.dbVerification.missing > 0);
    if (batchesWithMissing.length > 0) {
      console.warn(`⚠️ ${batchesWithMissing.length} lotes têm códigos faltando no DB!`);
      console.table(batchesWithMissing.map(b => ({
        Lote: b.batchNumber,
        Enviados: b.codes.length,
        Encontrados: b.dbVerification?.found || 0,
        Faltando: b.dbVerification?.missing || 0,
        RPC_Inserted: b.result?.inserted || 0,
        RPC_Skipped: b.result?.skipped || 0
      })));
    } else {
      console.log('✅ Todos os códigos foram encontrados no DB!');
    }
    
    return {
      success: true,
      message: `✅ Todos os materiais foram processados com sucesso! ${totalInserted} inseridos, ${totalSkipped} já existentes.`,
      stats: {
        totalProcessed: allMaterials.length,
        totalInserted,
        totalSkipped,
        totalFailed: 0,
      },
    };

  } catch (error: any) {
    console.error('❌ Erro durante o envio em lotes:', error);
    return {
      success: false,
      message: `Erro ao enviar materiais: ${error.message}`,
      stats: {
        totalProcessed: allMaterials.length,
        totalInserted,
        totalSkipped,
        totalFailed: allMaterials.length - (totalInserted + totalSkipped),
      },
    };
  }
}


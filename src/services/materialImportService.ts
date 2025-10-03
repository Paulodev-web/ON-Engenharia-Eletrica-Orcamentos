import Papa from 'papaparse';

/**
 * Interface para o resultado do processamento do CSV
 */
export interface ProcessCSVResult {
  success: boolean;
  data?: any[];
  message: string;
}

/**
 * Processa um arquivo CSV de materiais e retorna os dados formatados
 * @param file - Arquivo CSV a ser processado
 * @returns Promise com o resultado do processamento
 */
export async function processMaterialCSV(file: File): Promise<ProcessCSVResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data as Array<string[]>;
          
          if (!parsedData || parsedData.length === 0) {
            resolve({ 
              success: false, 
              message: 'Planilha vazia ou em formato inválido.' 
            });
            return;
          }

          // Filtrar dados: começar da linha 3 (índice 2), ignorar últimas 2 linhas
          const totalLines = parsedData.length;
          const filteredData = parsedData
            .slice(2, totalLines - 2); // Pular primeiras 2 linhas e últimas 2 linhas

          console.log(`📊 Total de linhas no CSV: ${totalLines}`);
          console.log(`📊 Linhas após filtros: ${filteredData.length}`);

          const materialsToUpsert = filteredData.map(row => {
            const internalCode = row[0]; // Coluna A
            const description = row[1]; // Coluna B

            if (!internalCode || !description) {
              return null;
            }

            return {
              code: internalCode.trim(),
              name: description.trim(),
              description: description.trim(),
              price: 0,
              unit: 'un',
            };
          }).filter(Boolean);

          // Remover duplicatas baseado no código
          const uniqueMaterials = materialsToUpsert.reduce((acc, material) => {
            if (!material) return acc; // Pular se material for null
            
            const existingIndex = acc.findIndex(m => m && m.code === material.code);
            if (existingIndex >= 0) {
              // Se já existe, atualiza com a última descrição encontrada
              acc[existingIndex] = material;
            } else {
              acc.push(material);
            }
            return acc;
          }, [] as typeof materialsToUpsert);

          console.log(`📊 Materiais únicos após remoção de duplicatas: ${uniqueMaterials.length}`);

          if (uniqueMaterials.length === 0) {
            resolve({ 
              success: false, 
              message: 'Nenhum material válido encontrado. Verifique se a planilha possui dados nas colunas A (código) e B (descrição) a partir da linha 3.' 
            });
            return;
          }

          resolve({
            success: true,
            data: uniqueMaterials,
            message: `${uniqueMaterials.length} materiais processados com sucesso.`
          });

        } catch (error: any) {
          console.error('Erro no processamento do CSV:', error);
          resolve({ 
            success: false, 
            message: `Falha no processamento: ${error.message}` 
          });
        }
      },
      error: (error) => {
        console.error('Erro ao fazer parse do CSV:', error);
        resolve({ 
          success: false, 
          message: `Erro ao ler o arquivo: ${error.message}` 
        });
      }
    });
  });
}



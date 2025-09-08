import React from 'react';
import { Calculator, Package } from 'lucide-react';
import { BudgetPostDetail, BudgetDetails } from '../types';

interface PainelConsolidadoProps {
  budgetDetails: BudgetDetails | null;
  orcamentoNome: string;
}

interface MaterialConsolidado {
  materialId: string;
  codigo: string;
  nome: string;
  unidade: string;
  precoUnit: number;
  quantidade: number;
  subtotal: number;
}

export function PainelConsolidado({ budgetDetails, orcamentoNome }: PainelConsolidadoProps) {
  
  const consolidarMateriais = (): MaterialConsolidado[] => {
    if (!budgetDetails || !budgetDetails.posts || budgetDetails.posts.length === 0) {
      return [];
    }

    const materiaisMap = new Map<string, MaterialConsolidado>();

    // Percorrer todos os postes
    budgetDetails.posts.forEach(post => {
      // Percorrer todos os grupos do poste
      post.post_item_groups.forEach(group => {
        // Percorrer todos os materiais do grupo
        group.post_item_group_materials.forEach(material => {
          const materialId = material.material_id;
          const materialData = material.materials;

          if (materiaisMap.has(materialId)) {
            // Material já existe, somar quantidade
            const existingMaterial = materiaisMap.get(materialId)!;
            existingMaterial.quantidade += material.quantity;
            existingMaterial.subtotal = existingMaterial.quantidade * existingMaterial.precoUnit;
          } else {
            // Novo material, adicionar ao mapa
            materiaisMap.set(materialId, {
              materialId,
              codigo: materialData.code || '',
              nome: materialData.name || 'Material sem nome',
              unidade: materialData.unit || '',
              precoUnit: materialData.price || 0,
              quantidade: material.quantity,
              subtotal: (materialData.price || 0) * material.quantity,
            });
          }
        });
      });
      
      // Percorrer todos os materiais avulsos do poste (incluindo o próprio poste)
      post.post_materials.forEach(material => {
        const materialId = material.material_id;
        const materialData = material.materials;

        if (materiaisMap.has(materialId)) {
          // Material já existe, somar quantidade
          const existingMaterial = materiaisMap.get(materialId)!;
          existingMaterial.quantidade += material.quantity;
          existingMaterial.subtotal = existingMaterial.quantidade * existingMaterial.precoUnit;
        } else {
          // Novo material, adicionar ao mapa
          materiaisMap.set(materialId, {
            materialId,
            codigo: materialData.code || '',
            nome: materialData.name || 'Material sem nome',
            unidade: materialData.unit || '',
            precoUnit: material.price_at_addition || 0,
            quantidade: material.quantity,
            subtotal: (material.price_at_addition || 0) * material.quantity,
          });
        }
      });

      // REMOVIDO: Lógica duplicada que somava post.post_types
      // Agora os postes são automaticamente incluídos via post_materials
    });

    // Converter mapa para array e ordenar por nome
    return Array.from(materiaisMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const materiaisConsolidados = consolidarMateriais();
  const custoTotal = materiaisConsolidados.reduce((total, material) => total + material.subtotal, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Consolidação de Materiais</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">{orcamentoNome}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {materiaisConsolidados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum material encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione postes e grupos de itens para ver os materiais
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd. Total
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materiaisConsolidados.map((material, index) => (
                  <tr key={material.materialId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {material.nome}
                        </div>
                        {material.codigo && (
                          <div className="text-xs text-gray-500">
                            Código: {material.codigo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      <span className="font-medium">{material.quantidade}</span>
                      {material.unidade && (
                        <span className="text-gray-500 ml-1">{material.unidade}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(material.precoUnit)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(material.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé com Total */}
      {materiaisConsolidados.length > 0 && (
        <div className="border-t bg-white mt-4 p-4 rounded-lg flex-shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{materiaisConsolidados.length} materiais únicos</span>
              <span className="text-gray-500">({budgetDetails?.posts?.length || 0} postes)</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium text-gray-700">Custo Total:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(custoTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

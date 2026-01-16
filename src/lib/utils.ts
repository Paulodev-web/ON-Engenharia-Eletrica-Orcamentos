import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BudgetPostDetail } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gera o nome completo de um poste combinando o nome personalizado (se houver) com o contador
 * @param post - Detalhes do poste
 * @returns Nome completo do poste (ex: "P-01", "Entrada 01", "02")
 */
export function getPostDisplayName(post: BudgetPostDetail | { custom_name?: string; counter?: number; name?: string }): string {
  // ⚠️ COMPATIBILIDADE: Se counter não existir ou for 0, usar o name original (POSTES ANTIGOS)
  // Isso garante que orçamentos antigos continuem funcionando com a nomenclatura original
  if (!post.counter || post.counter === 0) {
    return post.name || 'Poste';
  }
  
  // ✅ NOVO SISTEMA: Combinar custom_name + counter (POSTES NOVOS)
  // Se houver nome personalizado, combinar com contador
  if (post.custom_name && post.custom_name.trim()) {
    return `${post.custom_name.trim()} ${post.counter.toString().padStart(2, '0')}`;
  }
  
  // Se não houver nome personalizado, usar apenas o contador formatado
  return post.counter.toString().padStart(2, '0');
}

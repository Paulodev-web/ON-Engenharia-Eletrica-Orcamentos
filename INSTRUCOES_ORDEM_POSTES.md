# Sistema de Ordenação de Postes

## Implementação Completa

Agora o usuário pode personalizar tanto o **nome** quanto a **ordem** dos postes no sistema.

## Funcionalidades

### 1. Nome Personalizável
- Campo editável no modal de edição do poste
- Exemplo: "P", "Poste", "Entrada", "Saída", etc.
- Pode ser deixado em branco

### 2. Contador (Ordem)
- Número sequencial gerenciado automaticamente ao criar
- **Editável manualmente** para reordenar postes
- Campo numérico (mínimo 1)
- Valida entrada inválida

### 3. Nome Completo
- Formato: `{nome_personalizado} {contador_formatado}`
- Exemplos:
  - "P 01", "P 02", "P 03"
  - "Entrada 01", "Entrada 02"
  - "01", "02" (se não houver nome personalizado)

## Como Usar

### Alterar Ordem do Poste

1. Abra o modal de edição do poste (clique no poste no canvas)
2. Na aba "Informações", clique no ícone de edição ao lado do contador
3. Digite o novo número da ordem
4. Clique em ✓ (Salvar) ou pressione Enter
5. A lista será automaticamente reordenada

### Renomear Poste

1. No mesmo modal, clique no ícone de edição ao lado do "Nome Personalizável"
2. Digite o novo nome (ex: "Entrada", "Saída", "P")
3. Clique em ✓ (Salvar) ou pressione Enter

## Ordenação

Os postes são exibidos em ordem crescente pelo contador:
- Contador 1 aparece primeiro
- Contador 2 em seguida
- E assim por diante

**Nota:** Contadores duplicados são permitidos. Em caso de empate, a ordem de criação é usada como critério de desempate.

## Implementação Técnica

### Backend (Supabase)
- Coluna `counter` (INTEGER, NOT NULL)
- Coluna `custom_name` (TEXT, nullable)
- Índice `idx_budget_posts_counter` para otimizar ordenação

### Frontend
- Query ordenada por `counter ASC`
- Validação no lado do cliente (mínimo 1)
- Atualização otimista do estado local
- Função `updatePostCounter()` no AppContext

### Componentes Afetados
- `EditPostModal.tsx` - UI para editar contador
- `AppContext.tsx` - Lógica de atualização
- `AreaTrabalho.tsx` - Ordenação da lista
- `CanvasVisual.tsx` - Exibição no canvas
- `utils.ts` - Função `getPostDisplayName()`

## Benefícios

✅ **Flexibilidade Total** - Nome e ordem personalizáveis
✅ **Interface Intuitiva** - Edição inline com feedback visual
✅ **Performance** - Ordenação otimizada com índice
✅ **Validação** - Previne erros de entrada
✅ **UX Consistente** - Ordenação automática após mudanças

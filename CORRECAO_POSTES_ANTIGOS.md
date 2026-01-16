# 🔧 Correção: Postes Antigos com Números Duplicados

## 🔴 Problema Identificado

Os postes antigos estão mostrando números duplicados:
- "9 10" ao invés de "P-10"
- "4 09" ao invés de "P-09"
- "07 08" ao invés de "P-08"

**Causa:** A migração anterior preencheu o campo `counter` em todos os postes, inclusive os antigos.

---

## ✅ Solução

Execute esta migração de **correção** no Supabase:

### SQL de Correção

```sql
-- Migration: Fix legacy posts - Reset counter to 0 for existing posts
-- This ensures old budgets keep their original naming without the new counter system

-- Resetar counter para 0 em TODOS os postes existentes
-- Isso faz com que o sistema use apenas o campo 'name' original
UPDATE budget_posts
SET counter = 0
WHERE counter IS NOT NULL;

-- Limpar custom_name de postes antigos (não será usado quando counter = 0)
UPDATE budget_posts
SET custom_name = NULL
WHERE counter = 0;

-- Garantir que DEFAULT seja 0 para novos registros criados sem especificar counter
ALTER TABLE budget_posts 
ALTER COLUMN counter SET DEFAULT 0;

-- Comentário atualizado
COMMENT ON COLUMN budget_posts.counter IS 'Counter for post ordering. 0 = legacy post (uses name field only), >=1 = new post (uses custom_name + counter)';
```

---

## 📋 Passo a Passo

1. **Acesse o Supabase Dashboard**
   - [https://supabase.com](https://supabase.com)
   - Entre no seu projeto

2. **Abra o SQL Editor**
   - Menu lateral → SQL Editor
   - Clique em "+ New Query"

3. **Cole a SQL de Correção acima**

4. **Execute** (botão "Run" verde)

5. **Aguarde confirmação** "Success"

6. **Recarregue a página** do aplicativo (F5)

---

## 🎯 O que a Correção Faz

### Antes (Errado)
```sql
-- Postes antigos com counter preenchido
counter = 1, name = "P-01"  → Exibe "P-01 01" ❌
counter = 2, name = "P-02"  → Exibe "P-02 02" ❌
counter = 3, name = "P-03"  → Exibe "P-03 03" ❌
```

### Depois (Correto)
```sql
-- Postes antigos com counter = 0
counter = 0, name = "P-01"  → Exibe "P-01" ✅
counter = 0, name = "P-02"  → Exibe "P-02" ✅
counter = 0, name = "P-03"  → Exibe "P-03" ✅
```

---

## ⚠️ Importante

### Não Afeta Novos Postes
Depois de executar esta correção:
- ✅ Postes **antigos** voltam ao normal (counter = 0)
- ✅ Postes **novos criados daqui pra frente** usarão counter >= 1
- ✅ Sistema funciona perfeitamente para ambos

### Sistema de Detecção
```typescript
// O código já está preparado:
if (post.counter === 0) {
  return post.name;  // "P-01" (antigo)
} else {
  return `${custom_name} ${counter}`;  // "P 01" (novo)
}
```

---

## 📝 Resumo

| | Antes da Correção | Depois da Correção |
|---|---|---|
| Poste "P-01" | "P-01 01" ❌ | "P-01" ✅ |
| Poste "P-10" | "P-10 10" ❌ | "P-10" ✅ |
| Poste "Entrada-1" | "Entrada-1 01" ❌ | "Entrada-1" ✅ |

---

## ✅ Após Executar

1. Recarregue a página (F5)
2. Os postes antigos voltam aos nomes originais
3. Novos postes criados usam o sistema novo
4. Problema resolvido! 🎉

**Execute a migração de correção agora!** 🚀

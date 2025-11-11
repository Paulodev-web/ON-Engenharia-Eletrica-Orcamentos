# 📋 Instruções para Aplicar a Migração do Sistema de Pastas

## Pré-requisitos

- Acesso ao painel do Supabase
- Permissões de administrador no projeto

## Opção 1: Via Painel do Supabase (Recomendado)

### Passo 1: Acessar o SQL Editor
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar a Migração
1. Clique em **New Query**
2. Copie todo o conteúdo do arquivo: `supabase/migrations/20251111000000_create_budget_folders.sql`
3. Cole no editor SQL
4. Clique em **Run** ou pressione `Ctrl+Enter`

### Passo 3: Verificar
Execute esta query para confirmar que a tabela foi criada:

```sql
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'budget_folders';
```

Você deve ver as colunas:
- id (uuid)
- name (text)
- color (text)
- user_id (uuid)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Passo 4: Verificar RLS
Execute esta query para confirmar que as políticas foram criadas:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'budget_folders';
```

Você deve ver 4 políticas:
- Users can view their own folders (SELECT)
- Users can insert their own folders (INSERT)
- Users can update their own folders (UPDATE)
- Users can delete their own folders (DELETE)

## Opção 2: Via CLI do Supabase

### Passo 1: Instalar CLI (se necessário)
```bash
npm install -g supabase
```

### Passo 2: Login
```bash
supabase login
```

### Passo 3: Link ao Projeto
```bash
supabase link --project-ref SEU_PROJECT_REF
```

### Passo 4: Aplicar Migrações
```bash
supabase db push
```

## Opção 3: Execução Manual (Script SQL)

Se preferir executar o SQL manualmente, aqui está o conteúdo completo:

```sql
-- Criar tabela de pastas de orçamentos
CREATE TABLE IF NOT EXISTS budget_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna folder_id na tabela budgets
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES budget_folders(id) ON DELETE SET NULL;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_budget_folders_user_id ON budget_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_folder_id ON budgets(folder_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE budget_folders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para budget_folders
CREATE POLICY "Users can view their own folders"
  ON budget_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
  ON budget_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON budget_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON budget_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_budget_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_folders_updated_at_trigger
  BEFORE UPDATE ON budget_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_folders_updated_at();
```

## ✅ Verificação Final

Depois de aplicar a migração, teste o sistema:

1. **Login na Aplicação**: Faça login como um usuário normal
2. **Criar Pasta**: Clique em "Nova Pasta" e crie uma pasta de teste
3. **Criar Orçamento**: Crie um novo orçamento
4. **Mover Orçamento**: Arraste o orçamento para a pasta
5. **Verificar no Banco**: Confirme que o `folder_id` foi atualizado

## 🐛 Problemas Comuns

### Erro: "relation budget_folders does not exist"
**Solução**: A migração não foi executada. Execute novamente o SQL.

### Erro: "permission denied for table budget_folders"
**Solução**: As políticas RLS não foram criadas. Execute as queries de políticas novamente.

### Erro: "column folder_id does not exist"
**Solução**: A coluna não foi adicionada à tabela budgets. Execute:
```sql
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES budget_folders(id) ON DELETE SET NULL;
```

### Pastas não aparecem na interface
**Solução**: 
1. Abra o Console do navegador (F12)
2. Procure por erros na aba Console
3. Verifique a aba Network para ver se as requisições estão retornando dados
4. Tente fazer logout e login novamente

## 📊 Rollback (Reverter Migração)

Se precisar reverter as mudanças:

```sql
-- Remover trigger
DROP TRIGGER IF EXISTS budget_folders_updated_at_trigger ON budget_folders;
DROP FUNCTION IF EXISTS update_budget_folders_updated_at();

-- Remover políticas
DROP POLICY IF EXISTS "Users can view their own folders" ON budget_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON budget_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON budget_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON budget_folders;

-- Remover coluna da tabela budgets
ALTER TABLE budgets DROP COLUMN IF EXISTS folder_id;

-- Remover índices
DROP INDEX IF EXISTS idx_budget_folders_user_id;
DROP INDEX IF EXISTS idx_budgets_folder_id;

-- Remover tabela
DROP TABLE IF EXISTS budget_folders;
```

## 🎉 Conclusão

Após seguir estas instruções, seu sistema de pastas estará completamente funcional!

Para mais informações sobre como usar o sistema de pastas, consulte o arquivo `SISTEMA_DE_PASTAS.md`.


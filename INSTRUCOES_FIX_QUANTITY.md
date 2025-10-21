# Como Corrigir o Problema das Quantidades Decimais

## Problema
Você alterou o front-end para aceitar números decimais (como 0.5, 0.25, 1.75) nas quantidades de materiais nos grupos, mas o banco de dados ainda está configurado para aceitar apenas números inteiros (INTEGER).

## Erro que você está vendo
```
invalid input syntax for type integer: "0.25"
```

## Solução

Você precisa executar o seguinte SQL no painel do Supabase:

### Passo 1: Acesse o SQL Editor do Supabase
1. Abra seu projeto no Supabase: https://supabase.com/dashboard
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**

### Passo 2: Execute o SQL
Cole o seguinte código no editor e clique em **Run**:

```sql
-- Alterar coluna quantity em template_materials
ALTER TABLE template_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Alterar coluna quantity em post_item_group_materials  
ALTER TABLE post_item_group_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Alterar coluna quantity em post_materials
ALTER TABLE post_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;
```

### Passo 3: Verificar
Após executar, você pode verificar se funcionou executando:

```sql
-- Verificar os tipos das colunas
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('template_materials', 'post_item_group_materials', 'post_materials') 
  AND column_name = 'quantity';
```

Você deverá ver `numeric` ao invés de `integer` nas três linhas.

### Passo 4: Teste
Agora volte à sua aplicação e tente criar um grupo com quantidades decimais (como 0.5 ou 1.25). Deve funcionar perfeitamente!

## Alternativa: Via Supabase CLI
Se você tiver o Supabase CLI instalado localmente, pode executar:

```bash
supabase db execute --file fix_quantity_columns.sql
```

(O arquivo `fix_quantity_columns.sql` já foi criado no seu projeto com o SQL necessário)


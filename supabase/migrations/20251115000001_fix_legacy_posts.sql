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

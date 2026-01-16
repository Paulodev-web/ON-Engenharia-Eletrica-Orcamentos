-- Migration: Add counter and custom_name fields to budget_posts
-- This allows separating the user's custom name from an automatic counter

-- Primeiro, adicionar a coluna counter (começa em 1)
ALTER TABLE budget_posts 
ADD COLUMN IF NOT EXISTS counter INTEGER DEFAULT 0;

-- Adicionar a coluna custom_name (pode ser null)
ALTER TABLE budget_posts 
ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- ⚠️ IMPORTANTE: Não preencher dados antigos!
-- Postes antigos (counter = 0) continuarão usando o campo 'name' original
-- Apenas postes NOVOS usarão custom_name + counter
-- Isso garante compatibilidade retroativa sem bagunçar orçamentos existentes

-- Definir counter como NOT NULL com default 0
-- 0 = Poste antigo (usa 'name' original)
-- >= 1 = Poste novo (usa 'custom_name' + 'counter')
ALTER TABLE budget_posts 
ALTER COLUMN counter SET DEFAULT 0;

ALTER TABLE budget_posts 
ALTER COLUMN counter SET NOT NULL;

-- Adicionar índice para melhorar performance em queries que filtram por budget_id e counter
CREATE INDEX IF NOT EXISTS idx_budget_posts_counter ON budget_posts(budget_id, counter);

-- Adicionar comentários para documentar
COMMENT ON COLUMN budget_posts.counter IS 'Auto-incrementing counter for posts within a budget, managed by the application';
COMMENT ON COLUMN budget_posts.custom_name IS 'User-customizable name for the post (optional)';

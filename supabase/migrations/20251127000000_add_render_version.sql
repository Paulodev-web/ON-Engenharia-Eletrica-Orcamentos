-- Migration: Adicionar coluna render_version para versionamento de renderização de PDFs
-- Descrição: Esta coluna controla como o PDF é renderizado no Canvas:
--   - Version 1 (default): Lógica antiga (renderização com scale baixo + esticamento CSS)
--   - Version 2: Nova lógica (renderização em alta resolução nativa de 6000px)

-- Adicionar coluna render_version com default 1 (para projetos existentes)
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS render_version INTEGER DEFAULT 1 NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN budgets.render_version IS 'Versão da lógica de renderização do PDF: 1=legado (baixa resolução), 2=alta resolução nativa';

-- Criar índice para otimizar queries filtradas por versão (caso necessário no futuro)
CREATE INDEX IF NOT EXISTS idx_budgets_render_version ON budgets(render_version);


-- Migração para alterar colunas quantity de INTEGER para NUMERIC
-- Permite valores decimais nos grupos de materiais

-- 1. Alterar coluna quantity em template_materials
ALTER TABLE template_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- 2. Alterar coluna quantity em post_item_group_materials  
ALTER TABLE post_item_group_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- 3. Alterar coluna quantity em post_materials
ALTER TABLE post_materials 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Adicionar comentários para documentação
COMMENT ON COLUMN template_materials.quantity 
  IS 'Quantidade do material no template - aceita valores decimais (ex: 0.5, 1.25)';

COMMENT ON COLUMN post_item_group_materials.quantity 
  IS 'Quantidade do material no grupo do poste - aceita valores decimais (ex: 0.5, 1.25)';

COMMENT ON COLUMN post_materials.quantity 
  IS 'Quantidade do material avulso no poste - aceita valores decimais (ex: 0.5, 1.25)';


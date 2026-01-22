-- Adicionar suporte para pastas aninhadas
-- Adicionar coluna parent_id na tabela budget_folders
ALTER TABLE budget_folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES budget_folders(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de consultas hierárquicas
CREATE INDEX IF NOT EXISTS idx_budget_folders_parent_id ON budget_folders(parent_id);

-- Adicionar constraint para evitar ciclos (uma pasta não pode ser pai de si mesma)
ALTER TABLE budget_folders ADD CONSTRAINT budget_folders_no_self_reference 
  CHECK (parent_id IS NULL OR parent_id != id);

-- Função para verificar e prevenir ciclos na hierarquia de pastas
CREATE OR REPLACE FUNCTION check_folder_hierarchy_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  visited_ids UUID[];
BEGIN
  -- Se não há parent_id, não há risco de ciclo
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Inicializar a verificação
  current_id := NEW.parent_id;
  visited_ids := ARRAY[NEW.id];
  
  -- Percorrer a hierarquia até o topo
  WHILE current_id IS NOT NULL LOOP
    -- Se encontramos um ID já visitado, há um ciclo
    IF current_id = ANY(visited_ids) THEN
      RAISE EXCEPTION 'Ciclo detectado na hierarquia de pastas';
    END IF;
    
    -- Adicionar à lista de visitados
    visited_ids := array_append(visited_ids, current_id);
    
    -- Buscar o próximo pai
    SELECT parent_id INTO current_id 
    FROM budget_folders 
    WHERE id = current_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para verificar ciclos ao inserir ou atualizar
DROP TRIGGER IF EXISTS budget_folders_check_cycle_trigger ON budget_folders;
CREATE TRIGGER budget_folders_check_cycle_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON budget_folders
  FOR EACH ROW
  EXECUTE FUNCTION check_folder_hierarchy_cycle();

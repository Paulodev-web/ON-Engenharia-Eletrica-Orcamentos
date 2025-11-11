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


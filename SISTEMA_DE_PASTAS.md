# Sistema de Pastas para Orçamentos

## 📁 Visão Geral

O sistema de pastas permite organizar seus orçamentos de forma visual e intuitiva, similar ao explorador de arquivos do Windows. Você pode criar pastas personalizadas, nomeá-las, escolher cores e mover orçamentos entre pastas usando drag and drop.

## ✨ Funcionalidades

### 1. **Criar Pastas**
- Clique no botão "Nova Pasta" no canto superior direito
- Insira um nome para a pasta (máx. 50 caracteres)
- Escolha uma cor para identificação visual
- Visualize uma prévia antes de criar

### 2. **Organizar Orçamentos**
- **Arrastar e Soltar**: Arraste um orçamento e solte em qualquer pasta
- **Visual Feedback**: As pastas mudam de cor quando você arrasta um orçamento sobre elas
- **Sem Pasta**: Orçamentos sem pasta ficam na seção "Sem pasta"

### 3. **Gerenciar Pastas**
- **Expandir/Recolher**: Clique em uma pasta para ver os orçamentos dentro
- **Renomear**: Clique no menu (⋮) da pasta e selecione "Renomear"
- **Excluir**: Clique no menu (⋮) da pasta e selecione "Excluir"
  - Ao excluir uma pasta, os orçamentos são movidos para "Sem pasta"
- **Trocar Cor**: Use o modo de edição para mudar a cor da pasta

### 4. **Cards de Orçamento**
- Cada orçamento é exibido como um card com:
  - Nome do projeto
  - Cliente e cidade (se informado)
  - Status (Em Andamento / Finalizado)
  - Concessionária
  - Data de modificação
  - Ações rápidas (Editar, Duplicar, Finalizar, Excluir)

## 🎨 Cores Disponíveis

O sistema oferece 8 cores para personalização de pastas:
- 🔵 Azul
- 🟢 Verde
- 🟡 Amarelo
- 🔴 Vermelho
- 🟣 Roxo
- 🌸 Rosa
- ⚫ Cinza
- 🟠 Laranja

## 🗄️ Estrutura do Banco de Dados

### Tabela `budget_folders`
```sql
- id: UUID (Primary Key)
- name: TEXT (Nome da pasta)
- color: TEXT (Cor em hexadecimal)
- user_id: UUID (Referência ao usuário)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Tabela `budgets` (atualizada)
```sql
- ...campos existentes...
- folder_id: UUID (Referência à pasta, nullable)
```

## 🚀 Migração do Banco de Dados

Para aplicar as mudanças no banco de dados, execute a migração:

```bash
# Se estiver usando Supabase CLI
supabase db push

# Ou aplique manualmente o arquivo:
supabase/migrations/20251111000000_create_budget_folders.sql
```

## 🔒 Segurança

- **Row Level Security (RLS)**: Habilitado em todas as tabelas
- **Políticas**: Usuários só podem ver e gerenciar suas próprias pastas
- **Validações**: Nomes de pastas são validados no frontend e backend

## 💡 Dicas de Uso

1. **Organize por Tipo**: Crie pastas como "Projetos 2024", "Obras Públicas", "Clientes VIP"
2. **Use Cores**: Atribua cores diferentes para diferentes categorias
3. **Mantenha Limpo**: Mova orçamentos finalizados para uma pasta "Concluídos"
4. **Busca Global**: A busca funciona em todos os orçamentos, independente da pasta

## 🎯 Interface do Usuário

### Layout Principal
```
┌─────────────────────────────────────────┐
│ Meus Orçamentos  [Nova Pasta] [Novo Or.]│
├─────────────────────────────────────────┤
│ [Estatísticas em Cards]                 │
├─────────────────────────────────────────┤
│ [Barra de Busca e Filtros]              │
├─────────────────────────────────────────┤
│ 📁 Projetos 2024 (5 orçamentos)         │
│   ├─ [Card Orçamento 1]                 │
│   ├─ [Card Orçamento 2]                 │
│   └─ [Card Orçamento 3]                 │
│                                          │
│ 📁 Obras Públicas (3 orçamentos)        │
│   └─ [Expandir para ver]                │
│                                          │
│ 📄 Sem pasta (2 orçamentos)             │
│   ├─ [Card Orçamento 4]                 │
│   └─ [Card Orçamento 5]                 │
└─────────────────────────────────────────┘
```

## 🐛 Solução de Problemas

### Orçamento não move para a pasta
- Verifique se você soltou o orçamento dentro da área da pasta
- Aguarde o feedback visual (borda azul) antes de soltar

### Pasta não aparece
- Atualize a página (F5)
- Verifique sua conexão com o banco de dados
- Verifique se a migração foi aplicada corretamente

### Erros ao criar pasta
- Certifique-se de que o nome não está vazio
- Verifique se você está autenticado
- Verifique os logs do navegador (F12 > Console)

## 📝 Changelog

### Versão 1.0.0 (11/11/2024)
- ✅ Sistema de pastas implementado
- ✅ Drag and drop de orçamentos
- ✅ Personalização de cores
- ✅ Interface estilo Windows Explorer
- ✅ Migração do banco de dados
- ✅ RLS e políticas de segurança
- ✅ Modais para criar/editar pastas

## 🤝 Contribuindo

Para adicionar novas funcionalidades ao sistema de pastas:

1. **Backend**: Atualize `src/contexts/AppContext.tsx`
2. **Frontend**: Atualize `src/components/Dashboard.tsx`
3. **Banco**: Crie uma nova migração em `supabase/migrations/`
4. **Tipos**: Atualize `src/types/index.ts`

## 📞 Suporte

Se encontrar problemas ou tiver sugestões, entre em contato com a equipe de desenvolvimento.


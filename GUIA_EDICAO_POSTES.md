# 📝 Guia Completo: Edição de Postes

## ✅ Funcionalidades Disponíveis

O sistema permite editar **3 propriedades** de cada poste:

### 1. 🏷️ Nome Personalizado
- **O que é**: Texto customizável para identificar o poste
- **Exemplos**: "P", "Poste", "Entrada", "Saída", "Principal", etc.
- **Pode ficar vazio**: Sim (neste caso, só o contador é exibido)

### 2. 🔢 Contador (Ordem)
- **O que é**: Número que define a posição do poste na listagem
- **Range**: Mínimo 1, sem limite máximo
- **Duplicados**: Permitidos (critério de desempate: data de criação)

### 3. 🎯 Nome Completo (Gerado Automaticamente)
- **Formato**: `{Nome Personalizado} {Contador}`
- **Exemplos**:
  - Nome: "P", Contador: 1 → **"P 01"**
  - Nome: "Entrada", Contador: 5 → **"Entrada 05"**
  - Nome: (vazio), Contador: 3 → **"03"**

---

## 📋 Como Editar um Poste

### Passo a Passo

1. **Abrir Modal de Edição**
   - Clique em qualquer poste no canvas **OU**
   - Clique em um poste na lista lateral

2. **Acessar Aba "Informações"**
   - Primeira aba do modal (ícone de pacote)

3. **Editar Nome Personalizado**
   - Clique no ícone ✏️ ao lado de "Nome Personalizado"
   - Digite o novo nome (ex: "P", "Entrada")
   - Clique em ✓ (verde) para salvar **OU** ❌ (vermelho) para cancelar

4. **Editar Contador/Ordem**
   - Clique no ícone ✏️ ao lado de "Contador (Ordem)"
   - Digite o novo número (ex: 1, 2, 10)
   - Clique em ✓ (verde) para salvar **OU** ❌ (vermelho) para cancelar

5. **Resultado**
   - Nome completo atualizado automaticamente
   - Lista reordenada automaticamente
   - Canvas atualizado em tempo real

---

## 🎨 Interface Visual

```
┌─────────────────────────────────────────────────┐
│  Editar Poste: P 03                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  [📦 Informações] [📁 Grupos] [📦 Materiais]   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Informações do Poste                    │   │
│  ├─────────────────────────────────────────┤   │
│  │                                         │   │
│  │ Nome Personalizado:                     │   │
│  │ ┌─────────────────────────────┐  ✏️    │   │
│  │ │ P                           │        │   │
│  │ └─────────────────────────────┘        │   │
│  │                                         │   │
│  │ Contador (Ordem):                       │   │
│  │ ┌─────────────────────────────┐  ✏️    │   │
│  │ │ 03                          │        │   │
│  │ └─────────────────────────────┘        │   │
│  │ 💡 Altere o contador para reordenar   │   │
│  │                                         │   │
│  │ ──────────────────────────────────────│   │
│  │                                         │   │
│  │ Nome Completo:           P 03          │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Modo de Edição

Quando você clica no ícone ✏️:

```
Antes (Visualização):
┌──────────────────────────────┐
│ P                         ✏️ │
└──────────────────────────────┘

Depois (Edição):
┌──────────────────────────────┐
│ [Entrada_____________] ✓ ❌ │
└──────────────────────────────┘
```

---

## ⚡ Teclas de Atalho

Durante a edição:
- **Enter** → Salva as alterações
- **Escape** → Cancela a edição
- **Tab** → Move para o próximo campo

---

## 💡 Casos de Uso

### Exemplo 1: Renomear Série de Postes
```
Antes:               Depois:
- P1 01             - Entrada 01
- P1 02             - Entrada 02
- P1 03             - Entrada 03
```

### Exemplo 2: Reordenar Postes
```
Antes:               Depois:
- P 01  (criar)     - P 03  (primeiro)
- P 02              - P 01  (segundo)
- P 03  (mover)     - P 02  (terceiro)
```

### Exemplo 3: Agrupar por Tipo
```
Resultado:
- Entrada 01
- Entrada 02
- Principal 01
- Principal 02
- Saída 01
- Saída 02
```

---

## 🐛 Validações

### Nome Personalizado
- ✅ Pode conter letras, números, espaços
- ✅ Pode ficar vazio
- ✅ Sem limite de caracteres (recomendado: até 20)

### Contador
- ❌ Não pode ser menor que 1
- ❌ Não pode ser texto
- ✅ Pode ser qualquer número ≥ 1
- ✅ Duplicados são permitidos

---

## 🎯 Dicas

1. **Padronize os Nomes**: Use prefixos consistentes (ex: "P", "E", "S")
2. **Use Contadores Espaçados**: Deixe intervalos (10, 20, 30) para facilitar inserções
3. **Agrupe por Função**: Use nomes diferentes para áreas diferentes
4. **Teste Antes**: Edite um poste para ver o resultado antes de mudar todos

---

## 🔧 Implementação Técnica

### Funções Disponíveis
- `updatePostCustomName(postId, customName)` - Atualiza nome
- `updatePostCounter(postId, newCounter)` - Atualiza ordem
- `getPostDisplayName(post)` - Gera nome completo

### Estados no EditPostModal
- `editingCustomName` - Controla modo de edição do nome
- `customNameInput` - Valor temporário durante edição
- `editingCounter` - Controla modo de edição do contador
- `counterInput` - Valor temporário durante edição

### Atualização em Cascata
1. Usuário edita → Estado local atualizado
2. Salva → Banco de dados atualizado
3. Contexto → `budgetDetails` atualizado
4. UI → Canvas e lista re-renderizam automaticamente

---

## ✅ Resumo

| Propriedade | Editável | Onde Editar | Validação |
|-------------|----------|-------------|-----------|
| Nome Personalizado | ✅ Sim | Modal → Info | Texto livre |
| Contador (Ordem) | ✅ Sim | Modal → Info | ≥ 1 |
| Nome Completo | ❌ Não | Gerado | Auto |
| Coordenadas | ✅ Sim | Arrastar no canvas | - |

**Tudo pronto para uso!** 🚀

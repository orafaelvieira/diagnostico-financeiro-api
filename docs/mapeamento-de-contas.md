# Mapeamento de Contas — Abordagem Técnica

## Visão Geral

O sistema recebe demonstrações financeiras (Balanço Patrimonial, DRE, Balancetes) em formatos XLSX e PDF, exportados de diversos ERPs brasileiros (TOTVS, SAP, Omie, Conta Azul, entre outros). Cada ERP utiliza nomenclaturas e estruturas diferentes para as mesmas contas contábeis. O objetivo do mapeamento é normalizar essas variações em um modelo padronizado de 44 contas (BP) e 25 contas (DRE), permitindo o cálculo automático de 36 indicadores financeiros.

### O problema

Documentos financeiros brasileiros apresentam variações como:

| Nomenclatura no documento     | Conta padronizada no sistema             |
|-------------------------------|------------------------------------------|
| "Disponibilidades"            | Caixa e Equivalentes de Caixa            |
| "Duplicatas a Receber"        | Contas a Receber                         |
| "Mercadorias"                 | Estoques                                 |
| "Empréstimos Bancários" (PC)  | Empréstimos e Financiamentos - Curto Prazo |
| "Empréstimos Bancários" (PNC) | Empréstimos e Financiamentos - Longo Prazo |

O último exemplo ilustra o caso mais crítico: **o mesmo nome de conta aparece em grupos diferentes do balanço e deve mapear para contas destino distintas**.

---

## Arquitetura do Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Upload     │────>│   Parser     │────>│  Account Mapper  │────>│  Dados        │
│  XLSX / PDF  │     │  (extração)  │     │  (mapeamento)    │     │  Estruturados │
└──────────────┘     └──────────────┘     └──────────────────┘     └───────────────┘
                           │                      │
                     Detecta grupo          Consulta 3 fontes
                     de cada linha          em cascata
                     (AC/ANC/PC/PNC/PL)
```

### Arquivos envolvidos

| Arquivo                              | Responsabilidade                              |
|--------------------------------------|-----------------------------------------------|
| `src/services/parser.ts`             | Extrai linhas do XLSX/PDF com grupo detectado  |
| `src/services/account-mapper.ts`     | Mapeia contas extraídas para o modelo padrão   |
| `src/services/financial-templates.ts`| Define o modelo padrão (BP, DRE) e aliases     |
| `src/routes/analyses.ts`             | Orquestra o pipeline de extração               |
| `src/routes/dictionary.ts`           | CRUD do dicionário de contas (De-Para)         |
| `prisma/schema.prisma`               | Modelo AccountDictionary no banco              |
| `prisma/seed.ts`                     | Seed com ~141 mapeamentos globais iniciais     |

---

## Etapa 1: Extração e Detecção de Grupo

### XLSX

O parser (`parseExcel`) processa planilhas em 3 passos:

1. **Detecção de cabeçalho** — Varre as primeiras 20 linhas procurando padrões de período (meses, datas, trimestres). Suporta datas serializadas do Excel.
2. **Extração de linhas** — Cada linha abaixo do cabeçalho gera um `ExtractedRow` com `conta`, `valores` e opcionalmente `code` e `grupo`.
3. **Detecção de grupo** — Ao encontrar linhas como "ATIVO CIRCULANTE" ou "PASSIVO NÃO CIRCULANTE", o parser atualiza o `currentGrupo` e propaga para todas as linhas subsequentes até o próximo grupo.

```typescript
interface ExtractedRow {
  conta: string;                      // Nome da conta extraída
  valores: Record<string, number>;    // { "31/12/2023": 1500000, "31/12/2024": 1800000 }
  code?: string;                      // Código hierárquico (ex: "1.01.01")
  grupo?: string;                     // Grupo detectado: "AC" | "ANC" | "PC" | "PNC" | "PL"
}
```

### PDF

Para PDFs, o grupo é derivado do código hierárquico quando disponível:

| Prefixo do código | Grupo |
|--------------------|-------|
| `1.01.*`           | AC    |
| `1.02.*`           | ANC   |
| `2.01.*`           | PC    |
| `2.02.*`           | PNC   |
| `2.03.*`           | PL    |

---

## Etapa 2: Mapeamento com Contexto de Grupo

O mapeamento é **algorítmico** (sem IA/LLM) e segue uma cascata de 5 estágios, onde cada estágio prefere candidatos **compatíveis com o grupo** da conta extraída.

### Cascata de resolução

```
   Conta extraída: "Empréstimos Bancários"
   Grupo detectado: PC
           │
           ▼
   ┌─────────────────────────────────────────────┐
   │  Estágio 0: Dicionário (banco de dados)     │ ◄── Prioridade máxima
   │  Busca por (nome + grupo) no DB             │     Inclui entradas globais + do usuário
   │  ✓ Match com grupo PC encontrado            │
   │  → "Empréstimos e Financiamentos - CP"      │
   └─────────────────────────────────────────────┘
           │ (se não encontrar)
           ▼
   ┌─────────────────────────────────────────────┐
   │  Estágio 1: Match exato por nome            │
   │  Normaliza (lowercase, sem acentos)         │
   │  Compara com nomes do BP_TEMPLATE           │
   │  Prefere candidato compatível com grupo     │
   └─────────────────────────────────────────────┘
           │ (se não encontrar)
           ▼
   ┌─────────────────────────────────────────────┐
   │  Estágio 2: Aliases estáticos               │
   │  ~400 mapeamentos em ACCOUNT_ALIASES        │
   │  "Disponibilidades" → "Caixa e Equiv."      │
   │  Prefere candidato compatível com grupo     │
   └─────────────────────────────────────────────┘
           │ (se não encontrar)
           ▼
   ┌─────────────────────────────────────────────┐
   │  Estágio 3: Contains (substring)            │
   │  "Caixa Matriz" contém "Caixa"?             │
   │  Exige mínimo 4 caracteres                  │
   │  Prefere candidato compatível com grupo     │
   └─────────────────────────────────────────────┘
           │ (se não encontrar)
           ▼
   ┌─────────────────────────────────────────────┐
   │  Estágio 4: Keyword overlap (fuzzy)         │
   │  Compara palavras-chave sobrepostas         │
   │  Score mínimo: 0.4 (40% de overlap)         │
   │  Boost de +0.1 para candidatos do grupo     │
   └─────────────────────────────────────────────┘
           │ (se não encontrar)
           ▼
   ┌─────────────────────────────────────────────┐
   │  Conta não mapeada (unmatched)              │
   │  → Adicionada a unmatchedAccounts[]         │
   │  → Exibida ao usuário para classificação    │
   │  → Classificação salva no dicionário        │
   └─────────────────────────────────────────────┘
```

### Compatibilidade de grupo

O grupo extraído (AC, ANC, PC, PNC, PL) é comparado com a `classificacao` do template:

| Grupo extraído | Classificações compatíveis no template |
|----------------|----------------------------------------|
| AC             | AC, AF, AO                             |
| ANC            | ANC                                    |
| PC             | PC, PO, PF                             |
| PNC            | PNC                                    |
| PL             | PL                                     |

Onde:
- **AF** = Ativo Financeiro (subgrupo de AC)
- **AO** = Ativo Operacional (subgrupo de AC)
- **PO** = Passivo Operacional (subgrupo de PC)
- **PF** = Passivo Financeiro (subgrupo de PC)

### Fallback sem grupo

Se o parser não conseguir detectar o grupo (documento sem cabeçalhos de seção e sem códigos hierárquicos), o mapeamento funciona normalmente **sem filtro de grupo** — o comportamento é idêntico ao match por nome puro. Isso garante retrocompatibilidade.

---

## Etapa 3: Dicionário de Contas (De-Para)

### Modelo de dados

```
AccountDictionary
├── id (UUID)
├── nomeOriginal     → "Empréstimos Bancários"
├── contaDestino     → "Empréstimos e Financiamentos - Curto Prazo"
├── grupoConta       → "Passivo Circulante"
├── tipo             → "BP" | "DRE"
├── userId           → null (global) | UUID (específico do usuário)
└── Unique: (nomeOriginal, tipo, grupoConta, userId)
```

A chave única composta `(nomeOriginal, tipo, grupoConta, userId)` permite que **a mesma conta tenha mapeamentos diferentes por grupo**:

| nomeOriginal           | grupoConta            | contaDestino                               |
|------------------------|-----------------------|--------------------------------------------|
| Empréstimos Bancários  | Passivo Circulante    | Empréstimos e Financiamentos - Curto Prazo |
| Empréstimos Bancários  | Passivo Não Circulante| Empréstimos e Financiamentos - Longo Prazo |

### Prioridade de entradas

1. **Entrada do usuário** (userId = UUID) — sobrescreve a global para o mesmo (nome, grupo)
2. **Entrada global** (userId = null) — seed do sistema com ~141 mapeamentos

### Fluxo de aprendizado

```
  Conta não mapeada encontrada
           │
           ▼
  Frontend exibe diálogo de classificação
  (UnmatchedAccountsDialog.tsx)
           │
  Usuário seleciona conta destino
  no dropdown agrupado
           │
           ▼
  POST /dictionary/classify
  {
    entries: [{
      nomeOriginal: "Empréstimos Bancários",
      contaDestino: "Empréstimos e Financiamentos - Curto Prazo",
      grupoConta: "Passivo Circulante"
    }]
  }
           │
           ▼
  Entrada salva no dicionário do usuário
           │
           ▼
  Próximo upload com "Empréstimos Bancários"
  em Passivo Circulante → mapeamento automático
```

---

## Modelo Padronizado: Balanço Patrimonial (44 contas)

```
AT  ── Ativo Total
│
├── AC  ── Ativo Circulante
│   ├── AF ── Caixa e Equivalentes de Caixa
│   ├── AO ── Contas a Receber
│   ├── AO ── Estoques
│   ├── AO ── Ativos Biológicos
│   ├── AO ── Tributos a Recuperar
│   ├── AF ── Outros Créditos a Receber
│   ├── AO ── Despesas Ant. / Adiantamentos - Ativo
│   └── AF ── Outros Ativos Circulantes
│
├── ANC ── Ativo Não Circulante
│   ├── Realizável a Longo Prazo
│   ├── Investimentos
│   ├── Imobilizado
│   ├── Intangível
│   ├── Bens a Alienar
│   └── Ativo Diferido
│
PT  ── Passivo Total
│
├── PC  ── Passivo Circulante
│   ├── PO ── Fornecedores
│   ├── PO ── Obrigações Trabalhistas
│   ├── PO ── Obrigações Tributárias
│   ├── PF ── Empréstimos e Financiamentos - Curto Prazo
│   ├── PF ── Passivos com Partes Relacionadas - Curto Prazo
│   ├── PF ── Dividendos e JCP a Pagar
│   ├── PF ── Despesas Ant. / Adiantamentos - Passivo
│   └── PF ── Outros Passivos Circulantes
│
├── PNC ── Passivo Não Circulante
│   ├── Empréstimos e Financiamentos - Longo Prazo
│   ├── Passivos com Partes Relacionadas - Longo Prazo
│   ├── Tributos Diferidos - Longo Prazo
│   ├── Adiantamento para Futuro Aumento Capital - Longo Prazo
│   ├── Participação nos Lucros ou Resultados
│   └── Dividendos e Juros sobre o Capital Próprio
│
└── PL  ── Patrimônio Líquido
    ├── Capital Social
    ├── Reservas de Capital
    ├── Reservas de Reavaliação
    ├── Reservas de Lucros
    ├── Lucros/Prejuízos Acumulados
    ├── Resultado do Exercício
    ├── Ajustes de Avaliação Patrimonial
    └── Adiantamento para Futuro Aumento Capital - PL
```

### Subgrupos e sua função nos indicadores

| Subgrupo | Significado        | Usado no cálculo de                      |
|----------|--------------------|------------------------------------------|
| AF       | Ativo Financeiro   | Saldo em Tesouraria (ST)                 |
| AO       | Ativo Operacional  | Necessidade de Capital de Giro (NCG)     |
| PO       | Passivo Operacional| Necessidade de Capital de Giro (NCG)     |
| PF       | Passivo Financeiro | Saldo em Tesouraria (ST)                 |

---

## Modelo Padronizado: DRE (25 contas)

```
Receita Bruta de Vendas e/ou Serviços
(-) Deduções da Receita Bruta
= Receita Líquida
(-) Custo Operacional
= Resultado Bruto
(-) Despesas Gerais e Administrativas
(-) Despesas Com Vendas
(-) Perdas pela Não Recuperabilidade de Ativos
(+) Outras Receitas Operacionais
(+) Outras Despesas Operacionais
= Resultado Operacional
(+) Resultado da Equivalência Patrimonial
(+) Resultado Financeiro
    Receitas Financeiras
    Despesas Financeiras
(+) Resultado Não Operacional
    Receitas
    Despesas
= Resultado Antes Tributação/Participações
(-) Provisão para IR e Contribuição Social
(-) IR Diferido
(-) Participações/Contribuições Estatutárias
(+) Reversão dos Juros sobre Capital Próprio
(-) Part. de Acionistas Não Controladores
= Lucro ou Prejuízo do Período
```

---

## Validação Automática

Após o mapeamento, o sistema executa verificações automáticas:

### Equação patrimonial
```
Ativo Total = Passivo Total (que inclui PC + PNC + PL)
```
- Tolerância: 1% do Ativo Total
- Se falhar: alerta de "erro" com diferença percentual

### Composição
```
Ativo Circulante + Ativo Não Circulante = Ativo Total
Passivo Circulante + Passivo Não Circulante + PL = Passivo Total
```

### Sinais
- Receitas devem ser positivas
- Custos e deduções devem ser negativos (ou são sinalizados)

### Lei de Benford
Análise da distribuição do primeiro dígito de todos os valores financeiros. Se a distribuição divergir significativamente da curva esperada (chi-squared > 15.51), o sistema emite alerta de possível anomalia nos dados.

### Confidence scoring
Cada documento recebe uma nota de confiança (0-95%) baseada em:
- Quantidade de linhas extraídas
- Quantidade de períodos detectados
- Presença de códigos hierárquicos
- Resultado das validações

---

## API Endpoints

### Dicionário

| Método | Rota                    | Descrição                                  |
|--------|-------------------------|--------------------------------------------|
| GET    | `/dictionary`           | Listar entradas (filtros: search, tipo, grupo) |
| GET    | `/dictionary/template`  | Listar contas do modelo (para dropdowns)   |
| POST   | `/dictionary`           | Criar nova entrada                         |
| PUT    | `/dictionary/:id`       | Editar entrada (global cria override)      |
| DELETE | `/dictionary/:id`       | Excluir entrada do usuário                 |
| POST   | `/dictionary/classify`  | Classificar contas não mapeadas em lote    |

### Análise

| Método | Rota                                | Descrição                        |
|--------|-------------------------------------|----------------------------------|
| POST   | `/analyses/:id/process`             | Executar pipeline completo       |
| GET    | `/analyses/:id/dados-estruturados`  | Dados estruturados (BP+DRE+ind.) |
| GET    | `/analyses/:id/validacao`           | Resultado da validação           |

---

## Exemplo Completo

### Entrada (XLSX extraído)

```
ATIVO CIRCULANTE
  Caixa                    150.000
  Duplicatas a Receber     800.000
  Mercadorias              300.000

PASSIVO CIRCULANTE
  Fornecedores             400.000
  Empréstimos Bancários    200.000

PASSIVO NÃO CIRCULANTE
  Empréstimos Bancários    500.000
```

### Processo

1. Parser detecta 3 seções: grupo AC, PC, PNC
2. Cada linha recebe o grupo da seção atual
3. Mapper processa cada linha:

| Conta original         | Grupo | Estágio | Conta destino                             |
|------------------------|-------|---------|-------------------------------------------|
| Caixa                  | AC    | Dict    | Caixa e Equivalentes de Caixa             |
| Duplicatas a Receber   | AC    | Dict    | Contas a Receber                          |
| Mercadorias            | AC    | Dict    | Estoques                                  |
| Fornecedores           | PC    | Exato   | Fornecedores                              |
| Empréstimos Bancários  | PC    | Dict    | Empréstimos e Financiamentos - Curto Prazo|
| Empréstimos Bancários  | PNC   | Dict    | Empréstimos e Financiamentos - Longo Prazo|

### Saída (dados estruturados)

```json
{
  "bp": [
    { "classificacao": "AF", "conta": "Caixa e Equivalentes de Caixa", "valores": { "2024": 150000 } },
    { "classificacao": "AO", "conta": "Contas a Receber", "valores": { "2024": 800000 } },
    { "classificacao": "AO", "conta": "Estoques", "valores": { "2024": 300000 } },
    { "classificacao": "PO", "conta": "Fornecedores", "valores": { "2024": 400000 } },
    { "classificacao": "PF", "conta": "Empréstimos e Financiamentos - Curto Prazo", "valores": { "2024": 200000 } },
    { "classificacao": "PNC", "conta": "Empréstimos e Financiamentos - Longo Prazo", "valores": { "2024": 500000 } }
  ],
  "unmatchedAccounts": [],
  "version": 2
}
```

---

## Decisões de Design

### Por que algorítmico e não LLM?

| Fator          | Algorítmico (atual)   | LLM por chamada         |
|----------------|-----------------------|-------------------------|
| Latência       | < 50ms                | 2-5 segundos            |
| Custo          | Zero                  | ~R$0.01-0.03/documento  |
| Determinismo   | 100% reprodutível     | Pode variar entre calls |
| Alucinação     | Impossível            | Risco em números        |
| Auditabilidade | Estágio exato rastreável | Caixa-preta           |

O LLM (Claude Haiku) é usado para:
- **Geração do diagnóstico textual** (SWOT, recomendações, insights)
- **OCR de PDFs vetoriais** — PDFs onde o texto é renderizado como caminhos vetoriais (constructPath+fill) em vez de objetos de texto. Nesses casos, nem pdf-parse nem pdfjs-dist conseguem extrair texto. O sistema detecta isso automaticamente e envia o PDF para a API de documentos do Claude, que lê visualmente e transcreve as contas e valores.

O mapeamento numérico de contas continua sendo 100% algorítmico.

### Triple rendering para PDFs

PDFs de contabilidade brasileira são gerados por centenas de ERPs diferentes, cada um com suas peculiaridades de renderização. O sistema usa 3 camadas de fallback:

| Camada | Tecnologia | Quando usa | Preserva indentação |
|--------|-----------|------------|---------------------|
| 1. Custom renderer | pdfjs-dist getTextContent() | PDF tem texto normal | Sim (x-coordinates) |
| 2. Default renderer | pdf-parse padrão | Custom produz < 3 números BR | Não |
| 3. Claude OCR | Claude Haiku 4.5 vision API | Ambos retornam texto vazio (PDF vetorial) | Sim (via prompt) |

**PDFs vetoriais**: Alguns softwares contábeis (ex: gerador usado pela Insuagro) convertem todo o texto em curvas Bézier. O PDF tem operadores `constructPath`+`fill` em vez de `showText`. Resultado: 0 TextItems, 0 showText ops. A única forma de extrair dados é via OCR visual.

**Filtros pós-extração**:
- `removeChildRowsByValueSum()` — remove sub-contas cujos valores somam ao pai (BP somente, NÃO DRE)
- Filtro de profundidade (depth > 3) — remove detalhes excessivos quando indentação hierárquica detectada
- Strip de prefixos DRE: "(=)", "(-)", "(+)" removidos dos nomes de contas

### Por que grupo como contexto e não como chave primária?

O grupo é um **sinal de desambiguação**, não um requisito. Muitos documentos não têm cabeçalhos de seção ou códigos hierárquicos. O sistema funciona em 3 modos:

1. **Com grupo detectado** — mapeamento preciso, sem ambiguidades
2. **Com código hierárquico** — grupo derivado automaticamente
3. **Sem grupo** — fallback para matching por nome (comportamento original)

### Por que dicionário no banco e não só aliases estáticos?

- **Aprendizado contínuo** — cada classificação manual melhora extrações futuras
- **Personalização** — cada usuário pode ter mapeamentos específicos
- **Escalabilidade** — novos ERPs/formatos são absorvidos sem deploy
- **Override seguro** — entradas do usuário sobrescrevem globais sem perder as originais

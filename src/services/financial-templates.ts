// Canonical financial templates extracted from Base_Cálculo_Indicadores.xlsx
// These define the standard structure for BP (55 lines), DRE (25 lines), and 36 indicators

export const BP_TEMPLATE: Array<{ classificacao: string; conta: string; nivel: number }> = [
  // ATIVO
  { classificacao: "AT", conta: "Ativo Total", nivel: 0 },
  { classificacao: "AC", conta: "Ativo Circulante", nivel: 1 },
  { classificacao: "AF", conta: "Caixa e Equivalentes de Caixa", nivel: 2 },
  { classificacao: "AF", conta: "Aplicações Financeiras", nivel: 2 },
  { classificacao: "AO", conta: "Contas a Receber", nivel: 2 },
  { classificacao: "AO", conta: "Estoques", nivel: 2 },
  { classificacao: "AO", conta: "Ativos Biológicos", nivel: 2 },
  { classificacao: "AO", conta: "Tributos a Recuperar", nivel: 2 },
  { classificacao: "AO", conta: "Despesas Antecipadas", nivel: 2 },
  { classificacao: "AO", conta: "Outros Ativos Circulantes", nivel: 2 },
  { classificacao: "ANC", conta: "Ativo Realizável a Longo Prazo", nivel: 1 },
  { classificacao: "0", conta: "Aplicações Financeiras Avaliadas a Valor Justo - ALP", nivel: 2 },
  { classificacao: "0", conta: "Aplicações Financeiras Avaliadas ao Custo Amortizado - ALP", nivel: 2 },
  { classificacao: "0", conta: "Contas a Receber - ALP", nivel: 2 },
  { classificacao: "0", conta: "Estoques - ALP", nivel: 2 },
  { classificacao: "0", conta: "Ativos Biológicos - ALP", nivel: 2 },
  { classificacao: "0", conta: "Tributos Diferidos - ALP", nivel: 2 },
  { classificacao: "0", conta: "Despesas Antecipadas - ALP", nivel: 2 },
  { classificacao: "0", conta: "Créditos com Partes Relacionadas - ALP", nivel: 2 },
  { classificacao: "0", conta: "Outros Ativos Não Circulantes - ALP", nivel: 2 },
  { classificacao: "ANC", conta: "Investimentos - ALP", nivel: 1 },
  { classificacao: "ANC", conta: "Imobilizado - ALP", nivel: 1 },
  { classificacao: "ANC", conta: "Intangível - ALP", nivel: 1 },
  { classificacao: "ANC", conta: "Diferido - ALP", nivel: 1 },

  // PASSIVO
  { classificacao: "PT", conta: "Passivo Total", nivel: 0 },
  { classificacao: "PC", conta: "Passivo Circulante", nivel: 1 },
  { classificacao: "PO", conta: "Obrigações Sociais e Trabalhistas", nivel: 2 },
  { classificacao: "PO", conta: "Fornecedores", nivel: 2 },
  { classificacao: "PO", conta: "Obrigações Fiscais", nivel: 2 },
  { classificacao: "PF", conta: "Empréstimos e Financiamentos", nivel: 2 },
  { classificacao: "PF", conta: "Passivos com Partes Relacionadas", nivel: 2 },
  { classificacao: "PF", conta: "Dividendos e JCP a Pagar", nivel: 2 },
  { classificacao: "PF", conta: "Outros", nivel: 2 },
  { classificacao: "PF", conta: "Provisões", nivel: 2 },
  { classificacao: "PF", conta: "Passivos sobre Ativos Não-Correntes a Venda e Descontinuados", nivel: 2 },
  { classificacao: "PNC", conta: "Passivo Não Circulante", nivel: 1 },
  { classificacao: "0", conta: "Empréstimos e Financiamentos - PLP", nivel: 2 },
  { classificacao: "0", conta: "Passivos com Partes Relacionadas - PLP", nivel: 2 },
  { classificacao: "0", conta: "Outros - PLP", nivel: 2 },
  { classificacao: "0", conta: "Tributos Diferidos - PLP", nivel: 2 },
  { classificacao: "0", conta: "Adiantamento para Futuro Aumento Capital - PLP", nivel: 2 },
  { classificacao: "0", conta: "Provisões - PLP", nivel: 2 },
  { classificacao: "0", conta: "Passivos sobre Ativos Não-Correntes a Venda e Descontinuados - PLP", nivel: 2 },
  { classificacao: "0", conta: "Lucros e Receitas a Apropriar - PLP", nivel: 2 },
  { classificacao: "PNC", conta: "Participação dos Acionistas Não Controladores - PLP", nivel: 1 },

  // PATRIMÔNIO LÍQUIDO
  { classificacao: "PL", conta: "Patrimônio Líquido", nivel: 1 },
  { classificacao: "0", conta: "Capital Social Realizado", nivel: 2 },
  { classificacao: "0", conta: "Reservas de Capital", nivel: 2 },
  { classificacao: "0", conta: "Reservas de Reavaliação", nivel: 2 },
  { classificacao: "0", conta: "Reservas de Lucros", nivel: 2 },
  { classificacao: "0", conta: "Lucros/Prejuízos Acumulados", nivel: 2 },
  { classificacao: "0", conta: "Ajustes de Avaliação Patrimonial", nivel: 2 },
  { classificacao: "0", conta: "Ajustes Acumulados de Conversão", nivel: 2 },
  { classificacao: "0", conta: "Outros Resultados Abrangentes", nivel: 2 },
];

export const DRE_TEMPLATE: Array<{ conta: string; subtotal: boolean }> = [
  { conta: "Receita Bruta de Vendas e/ou Serviços", subtotal: false },
  { conta: "Deduções da Receita Bruta", subtotal: false },
  { conta: "Receita Líquida", subtotal: true },
  { conta: "Custo Operacional", subtotal: false },
  { conta: "Resultado Bruto", subtotal: true },
  { conta: "Despesas Gerais e Administrativas", subtotal: false },
  { conta: "Despesas Com Vendas", subtotal: false },
  { conta: "Perdas pela Não Recuperabilidade de Ativos", subtotal: false },
  { conta: "Outras Receitas Operacionais", subtotal: false },
  { conta: "Outras Despesas Operacionais", subtotal: false },
  { conta: "Resultado Operacional", subtotal: true },
  { conta: "Resultado da Equivalência Patrimonial", subtotal: false },
  { conta: "Resultado Financeiro", subtotal: false },
  { conta: "Receitas Financeiras", subtotal: false },
  { conta: "Despesas Financeiras", subtotal: false },
  { conta: "Resultado Não Operacional", subtotal: false },
  { conta: "Receitas", subtotal: false },
  { conta: "Despesas", subtotal: false },
  { conta: "Resultado Antes Tributação/Participações", subtotal: true },
  { conta: "Provisão para IR e Contribuição Social", subtotal: false },
  { conta: "IR Diferido", subtotal: false },
  { conta: "Participações/Contribuições Estatutárias", subtotal: false },
  { conta: "Reversão dos Juros sobre Capital Próprio", subtotal: false },
  { conta: "Part. de Acionistas Não Controladores", subtotal: false },
  { conta: "Lucro ou Prejuízo do Período", subtotal: true },
];

export const INDICADORES_TEMPLATE: Array<{
  tipo: string;
  nome: string;
  formula: string;
  tipoDado: "R$" | "%" | "Índice" | "Dias" | "Texto";
}> = [
  // Indicadores Operacionais
  { tipo: "Indicadores Operacionais", nome: "Receita Líquida", formula: "Receita Bruta (-) Impostos (-) Cancelamentos", tipoDado: "R$" },
  { tipo: "Indicadores Operacionais", nome: "Lucro Bruto", formula: "Receita Líquida (-) Custo Operacional", tipoDado: "R$" },
  { tipo: "Indicadores Operacionais", nome: "Lucro Operacional", formula: "Lucro Bruto (-) Despesas Gerais e Administrativas (-) Despesas Com Vendas (-) Perdas pela Não Recuperabilidade de Ativos (+) Outras Receitas Operacionais (+) Outras Despesas Operacionais", tipoDado: "R$" },
  { tipo: "Indicadores Operacionais", nome: "Lucro Líquido", formula: "Lucro Bruto (+) Resultado Financeiro (+) Resultado Não Operacional (-) Impostos sobre a Renda", tipoDado: "R$" },
  { tipo: "Indicadores Operacionais", nome: "NOPAT", formula: "Lucro Operacional × (1 - Impostos (34%))", tipoDado: "R$" },

  // Indicadores de Margens
  { tipo: "Indicadores de Margens", nome: "Margem Bruta", formula: "Lucro Bruto / Receita Líquida", tipoDado: "%" },
  { tipo: "Indicadores de Margens", nome: "Margem Operacional", formula: "Lucro Operacional / Receita Líquida", tipoDado: "%" },
  { tipo: "Indicadores de Margens", nome: "Margem Líquida", formula: "Lucro Líquido / Receita Líquida", tipoDado: "%" },

  // Indicadores de Liquidez
  { tipo: "Indicadores de Liquidez", nome: "Liquidez Imediata", formula: "Caixa e Equivalentes de Caixa / Passivo Circulante", tipoDado: "Índice" },
  { tipo: "Indicadores de Liquidez", nome: "Liquidez Seca", formula: "(Ativo Circulante - Estoques) / Passivo Circulante", tipoDado: "Índice" },
  { tipo: "Indicadores de Liquidez", nome: "Liquidez Corrente", formula: "Ativo Circulante / Passivo Circulante", tipoDado: "Índice" },
  { tipo: "Indicadores de Liquidez", nome: "Liquidez Geral", formula: "(Ativo Circulante + Ativo Realizável a Longo Prazo) / (Passivo Circulante + Passivo Não Circulante)", tipoDado: "Índice" },

  // Indicadores de Capital de Giro
  { tipo: "Indicadores de Capital de Giro", nome: "Capital de Giro (CDG)", formula: "Ativo Circulante - Passivo Circulante", tipoDado: "R$" },
  { tipo: "Indicadores de Capital de Giro", nome: "Necessidade de Capital de Giro (NCG)", formula: "Ativo Operacional - Passivo Operacional", tipoDado: "R$" },
  { tipo: "Indicadores de Capital de Giro", nome: "Saldo em Tesouraria (ST)", formula: "Capital de Giro (CDG) - Necessidade de Capital de Giro (NCG)", tipoDado: "R$" },
  { tipo: "Indicadores de Capital de Giro", nome: "Situação da empresa", formula: "Classificação baseada em CDG, NCG e ST", tipoDado: "Texto" },
  { tipo: "Indicadores de Capital de Giro", nome: "Prazo Médio Contas a Receber", formula: "(Contas a Receber × 365) / Receita Líquida", tipoDado: "Dias" },
  { tipo: "Indicadores de Capital de Giro", nome: "Prazo Médio Estoque", formula: "(Estoques × 365) / Custo Operacional", tipoDado: "Dias" },
  { tipo: "Indicadores de Capital de Giro", nome: "Prazo Médio Fornecedores", formula: "(Fornecedores × 365) / Custo Operacional", tipoDado: "Dias" },
  { tipo: "Indicadores de Capital de Giro", nome: "Ciclo Financeiro", formula: "Prazo Médio Contas a Receber + Prazo Médio Estoque - Prazo Médio Fornecedores", tipoDado: "Dias" },

  // Indicadores de Endividamento
  { tipo: "Indicadores de Endividamento", nome: "Caixa e Equivalentes", formula: "Caixa e Equivalentes de Caixa + Aplicações Financeiras + Aplicações Financeiras Avaliadas a Valor Justo - ALP + Aplicações Financeiras Avaliadas ao Custo Amortizado - ALP", tipoDado: "R$" },
  { tipo: "Indicadores de Endividamento", nome: "Capital de Terceiros", formula: "Empréstimos e Financiamentos + Passivos com Partes Relacionadas + Empréstimos e Financiamentos - PLP + Passivos com Partes Relacionadas - PLP", tipoDado: "R$" },
  { tipo: "Indicadores de Endividamento", nome: "Dívida Líquida", formula: "Capital de Terceiros - Caixa e Equivalentes", tipoDado: "R$" },
  { tipo: "Indicadores de Endividamento", nome: "Endividamento Geral", formula: "(Passivo Total - Patrimônio Líquido) / Passivo Total", tipoDado: "%" },
  { tipo: "Indicadores de Endividamento", nome: "Endividamento de Curto Prazo", formula: "Passivo Circulante / Passivo Total", tipoDado: "%" },
  { tipo: "Indicadores de Endividamento", nome: "Patrimônio Líquido", formula: "Patrimônio Líquido", tipoDado: "R$" },
  { tipo: "Indicadores de Endividamento", nome: "Capital Terceiros s/ PL", formula: "Capital de Terceiros / Patrimônio Líquido", tipoDado: "Índice" },
  { tipo: "Indicadores de Endividamento", nome: "Dívida Líquida/Lucro Operacional", formula: "Dívida Líquida / Lucro Operacional", tipoDado: "Índice" },
  { tipo: "Indicadores de Endividamento", nome: "Índice de Cobertura de Juros", formula: "Lucro Operacional / Despesas Financeiras", tipoDado: "Índice" },
  { tipo: "Indicadores de Endividamento", nome: "Despesa Financeira / Rec. Líquida", formula: "Despesas Financeiras / Receita Líquida", tipoDado: "%" },

  // Indicadores de Rentabilidade
  { tipo: "Indicadores de Rentabilidade", nome: "ROA (Retorno sobre Ativos)", formula: "Lucro ou Prejuízo do Período / Ativo Total", tipoDado: "%" },
  { tipo: "Indicadores de Rentabilidade", nome: "ROIC (Retorno sobre Capital Investido)", formula: "NOPAT / (Patrimônio Líquido + Capital de Terceiros)", tipoDado: "%" },

  // Indicadores de Rentabilidade - Modelo Dupont
  { tipo: "Indicadores de Rentabilidade - Modelo Dupont", nome: "ROE (Retorno sobre Patrimônio Líquido)", formula: "Lucro ou Prejuízo do Período / Patrimônio Líquido", tipoDado: "%" },
  { tipo: "Indicadores de Rentabilidade - Modelo Dupont", nome: "Margem Líquida", formula: "Lucro Líquido / Receita Líquida", tipoDado: "%" },
  { tipo: "Indicadores de Rentabilidade - Modelo Dupont", nome: "Giro do Ativo", formula: "Receita Líquida / Ativo Total", tipoDado: "Índice" },
  { tipo: "Indicadores de Rentabilidade - Modelo Dupont", nome: "Alavancagem", formula: "Passivo Total / Patrimônio Líquido", tipoDado: "Índice" },
];

// Account name aliases for normalization
// Maps common variations to the canonical name
export const ACCOUNT_ALIASES: Record<string, string> = {
  // ===== ATIVO =====
  "A T I V O": "Ativo Total",
  "ATIVO": "Ativo Total",
  "TOTAL DO ATIVO": "Ativo Total",
  "ATIVO TOTAL": "Ativo Total",
  "Total do Ativo": "Ativo Total",
  "Total Ativo": "Ativo Total",

  // Ativo Circulante
  "ATIVO CIRCULANTE": "Ativo Circulante",
  "Circulante": "Ativo Circulante",

  // Caixa e Equivalentes
  // NOTE: "Disponível"/"Disponibilidades" are PARENT accounts (level 3) that contain
  // "Caixa" as a child (level 4). They must NOT be aliased to "Caixa e Equivalentes"
  // to avoid collapsing hierarchy levels. The mapper handles them via isParentAccount().
  "Caixa e Bancos": "Caixa e Equivalentes de Caixa",
  "Caixa": "Caixa e Equivalentes de Caixa",
  "CAIXA": "Caixa e Equivalentes de Caixa",
  "CAIXA MATRIZ": "Caixa e Equivalentes de Caixa",
  "Bancos Conta Movimento": "Caixa e Equivalentes de Caixa",
  "BANCOS C/ MOVIMENTO": "Caixa e Equivalentes de Caixa",
  "BANCO CONTA MOVIMENTO": "Caixa e Equivalentes de Caixa",

  // Aplicações Financeiras
  "Aplicações de Liquidez Imediata": "Aplicações Financeiras",
  "APLICAÇÃO DE LIQUIDEZ IMEDIATA": "Aplicações Financeiras",
  "Investimentos de Curto Prazo": "Aplicações Financeiras",
  "BANCO CONTA APLICAÇÃO": "Aplicações Financeiras",
  "APLICAÇÕES FINANCEIRAS": "Aplicações Financeiras",

  // Contas a Receber
  "Clientes": "Contas a Receber",
  "CLIENTES A RECEBER": "Contas a Receber",
  "Duplicatas a Receber": "Contas a Receber",
  "DUPLICATAS A RECEBER": "Contas a Receber",
  "DUPLICATAS  A RECEBER": "Contas a Receber",
  "Títulos a Receber": "Contas a Receber",
  "CREDITOS A RECEBER": "Contas a Receber",
  "CREDITOS": "Contas a Receber",
  "CRÉDITOS A RECEBER": "Contas a Receber",

  // Estoques
  "Mercadorias": "Estoques",
  "Produtos Acabados": "Estoques",
  "Matérias-Primas": "Estoques",
  "Estoque": "Estoques",
  "ESTOQUES": "Estoques",
  "ESTOQUE GERAL": "Estoques",

  // Tributos a Recuperar
  "Impostos a Recuperar": "Tributos a Recuperar",
  "IMPOSTOS A RECUPERAR": "Tributos a Recuperar",
  "Créditos Tributários": "Tributos a Recuperar",
  "ICMS a Recuperar": "Tributos a Recuperar",
  "PIS a Recuperar": "Tributos a Recuperar",
  "COFINS a Recuperar": "Tributos a Recuperar",

  // Despesas Antecipadas
  "DESPESAS ANTECIPADAS": "Despesas Antecipadas",
  "DESPESAS DO EXERCICIO SEGUINTE": "Despesas Antecipadas",

  // Outros Ativos Circulantes
  "ADIANTAMENTOS CONCEDIDOS": "Outros Ativos Circulantes",
  "CONTAS TRANSITÓRIAS": "Outros Ativos Circulantes",
  "PRODUTOS EM TRANSITO": "Outros Ativos Circulantes",
  "DEPOSITOS JUDICIAIS": "Outros Ativos Circulantes",
  "EMPRESTIMOS A TERCEIROS": "Outros Ativos Circulantes",
  "CHEQUES EM COBRANÇA": "Outros Ativos Circulantes",

  // ANC
  "Realizável a Longo Prazo": "Ativo Realizável a Longo Prazo",
  "Ativo Não Circulante": "Ativo Realizável a Longo Prazo",
  "ATIVO NÃO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "ATIVO NÃO - CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "ATIVO NAO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "Ativo Permanente": "Ativo Realizável a Longo Prazo",

  // Investimentos
  "Investimentos": "Investimentos - ALP",
  "INVESTIMENTOS": "Investimentos - ALP",
  "PARTICIPAÇÃO EM OUTRAS EMPRESAS": "Investimentos - ALP",
  "OUTROS INVESTIMENTOS": "Investimentos - ALP",

  // Imobilizado
  "Imobilizado": "Imobilizado - ALP",
  "IMOBILIZADO": "Imobilizado - ALP",
  "Ativo Imobilizado": "Imobilizado - ALP",
  "BENS E DIREITOS EM USO": "Imobilizado - ALP",

  // Intangível
  "Intangível": "Intangível - ALP",
  "INTANGIVEL": "Intangível - ALP",
  "Ativo Intangível": "Intangível - ALP",
  "ATIVOS INTANGIVEIS": "Intangível - ALP",

  // ===== PASSIVO =====
  "P A S S I V O": "Passivo Total",
  "PASSIVO": "Passivo Total",
  "TOTAL DO PASSIVO": "Passivo Total",
  "PASSIVO TOTAL": "Passivo Total",
  "Total do Passivo": "Passivo Total",
  "Total Passivo": "Passivo Total",

  // Passivo Circulante
  "PASSIVO CIRCULANTE": "Passivo Circulante",

  // Obrigações Sociais e Trabalhistas
  "Obrigações Trabalhistas": "Obrigações Sociais e Trabalhistas",
  "OBRIGACOES TRABALHISTAS": "Obrigações Sociais e Trabalhistas",
  "PESSOAL / ENCARGOS": "Obrigações Sociais e Trabalhistas",
  "PROVISÃO P/DESPESAS C/ PESSOAL": "Obrigações Sociais e Trabalhistas",
  "Salários a Pagar": "Obrigações Sociais e Trabalhistas",
  "Encargos Sociais": "Obrigações Sociais e Trabalhistas",

  // Fornecedores
  "FORNECEDORES": "Fornecedores",

  // Obrigações Fiscais
  "Obrigações Tributárias": "Obrigações Fiscais",
  "OBRIGACOES TRIBUTARIAS": "Obrigações Fiscais",
  "TRIBUTOS A RECOLHER": "Obrigações Fiscais",
  "Impostos a Pagar": "Obrigações Fiscais",
  "Tributos a Pagar": "Obrigações Fiscais",
  "ICMS a Recolher": "Obrigações Fiscais",
  "ISS a Recolher": "Obrigações Fiscais",
  "PARCELAMENTO DE ICMS": "Obrigações Fiscais",

  // Empréstimos e Financiamentos
  "Financiamentos": "Empréstimos e Financiamentos",
  "Empréstimos": "Empréstimos e Financiamentos",
  "Empréstimos Bancários": "Empréstimos e Financiamentos",
  "EMPRESTIMOS BANCARIOS": "Empréstimos e Financiamentos",
  "EMPRESTIMOS E FINANCIAMENTOS": "Empréstimos e Financiamentos",
  "EMPRESTIMOS DE TERCEIROS": "Empréstimos e Financiamentos",

  // Outros (Passivo)
  "OUTRAS OBRIGAÇÕES": "Outros",
  "CONTAS A PAGAR": "Fornecedores",
  "ADIANTAMENTO RECEBIDO": "Outros",

  // Provisões
  "PROVISÕES": "Provisões",

  // Passivo Não Circulante
  "Exigível a Longo Prazo": "Passivo Não Circulante",
  "PASSIVO NÃO CIRCULANTE": "Passivo Não Circulante",
  "PASSIVO NAO CIRCULANTE": "Passivo Não Circulante",
  "PASSIVO EXIGIVEL A LONGO PRAZO": "Passivo Não Circulante",

  // Empréstimos LP
  "Financiamentos de Longo Prazo": "Empréstimos e Financiamentos - PLP",
  "Empréstimos de Longo Prazo": "Empréstimos e Financiamentos - PLP",

  // ===== PL =====
  "Capital Social": "Capital Social Realizado",
  "CAPITAL SOCIAL": "Capital Social Realizado",
  "Capital Subscrito": "Capital Social Realizado",
  "Reserva de Lucros": "Reservas de Lucros",
  "Reserva Legal": "Reservas de Lucros",
  "Reserva de Capital": "Reservas de Capital",
  "RESERVAS DE CAPITAL": "Reservas de Capital",
  "RESERVAS": "Reservas de Lucros",
  "Lucros Acumulados": "Lucros/Prejuízos Acumulados",
  "Prejuízos Acumulados": "Lucros/Prejuízos Acumulados",
  "LUCROS OU PREJUIZOS ACUMULADOS": "Lucros/Prejuízos Acumulados",
  "Resultado Acumulado": "Lucros/Prejuízos Acumulados",
  "RESULTADO DO EXERCICIO": "Lucros/Prejuízos Acumulados",
  "Patrimônio Líquido": "Patrimônio Líquido",
  "PATRIMONIO LIQUIDO": "Patrimônio Líquido",
  "PATRIMÔNIO LÍQUIDO": "Patrimônio Líquido",

  // ===== DRE =====
  "Receita Operacional Bruta": "Receita Bruta de Vendas e/ou Serviços",
  "Receita Bruta": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA BRUTA DE VENDAS E SERVIÇOS": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA BRUTA DE VENDAS E SERVICOS": "Receita Bruta de Vendas e/ou Serviços",
  "Faturamento Bruto": "Receita Bruta de Vendas e/ou Serviços",
  "VENDA DE MERCADORIAS E PRODUTOS": "Receita Bruta de Vendas e/ou Serviços",

  "(-) Deduções": "Deduções da Receita Bruta",
  "Deduções": "Deduções da Receita Bruta",
  "DEDUCOES DAS VENDAS": "Deduções da Receita Bruta",
  "DEDUÇÕES DAS VENDAS": "Deduções da Receita Bruta",
  "Impostos sobre Vendas": "Deduções da Receita Bruta",
  "IMPOSTOS S/FATURAMENTO": "Deduções da Receita Bruta",
  "ABATIMENTOS E DEVOLUÇÕES SOBRE VENDAS": "Deduções da Receita Bruta",

  "Receita Operacional Líquida": "Receita Líquida",
  "Receita Líquida de Vendas": "Receita Líquida",
  "RECEITA LIQUIDA": "Receita Líquida",

  "CMV": "Custo Operacional",
  "CPV": "Custo Operacional",
  "Custo das Mercadorias Vendidas": "Custo Operacional",
  "Custo dos Produtos Vendidos": "Custo Operacional",
  "CUSTO PRODUTOS VENDIDOS": "Custo Operacional",
  "Custo dos Serviços Prestados": "Custo Operacional",

  "Lucro Bruto": "Resultado Bruto",
  "Resultado Operacional Bruto": "Resultado Bruto",
  "RESULTADO BRUTO": "Resultado Bruto",

  "Despesas Administrativas": "Despesas Gerais e Administrativas",
  "Despesas Gerais": "Despesas Gerais e Administrativas",
  "DESPESAS GERAIS": "Despesas Gerais e Administrativas",
  "DESPESAS C/ PESSOAL": "Despesas Gerais e Administrativas",

  "Despesas com Vendas": "Despesas Com Vendas",
  "Despesas Comerciais": "Despesas Com Vendas",
  "DESPESAS COMERCIAIS": "Despesas Com Vendas",
  "DESPESAS COM TRANSPORTES": "Despesas Com Vendas",

  "Lucro Operacional": "Resultado Operacional",
  "EBIT": "Resultado Operacional",
  "Resultado Operacional Líquido": "Resultado Operacional",

  "OUTRAS RECEITAS OPERACIONAIS": "Outras Receitas Operacionais",
  "OUTRAS RECEITAS": "Outras Receitas Operacionais",

  "OUTRAS DESPESAS OPERACIONAIS": "Outras Despesas Operacionais",

  "Equivalência Patrimonial": "Resultado da Equivalência Patrimonial",
  "Resultado Financeiro Líquido": "Resultado Financeiro",

  "RECEITAS FINANCEIRAS": "Receitas Financeiras",
  "DESPESAS FINANCEIRAS": "Despesas Financeiras",
  "IMPOSTOS E TAXAS": "Outras Despesas Operacionais",

  "LAIR": "Resultado Antes Tributação/Participações",
  "Lucro Antes do IR": "Resultado Antes Tributação/Participações",
  "Resultado Antes dos Tributos": "Resultado Antes Tributação/Participações",

  "IR e CSLL": "Provisão para IR e Contribuição Social",
  "Imposto de Renda": "Provisão para IR e Contribuição Social",
  "IRPJ e CSLL": "Provisão para IR e Contribuição Social",

  "Lucro Líquido": "Lucro ou Prejuízo do Período",
  "Prejuízo do Período": "Lucro ou Prejuízo do Período",
  "Resultado Líquido": "Lucro ou Prejuízo do Período",
  "RESULTADO LIQUIDO DO EXERCICIO": "Lucro ou Prejuízo do Período",
  "Lucro/Prejuízo": "Lucro ou Prejuízo do Período",
  "Lucro do Exercício": "Lucro ou Prejuízo do Período",
  "Resultado do Exercício": "Lucro ou Prejuízo do Período",

  // ===== ALIASES ADICIONAIS — ERP variations (TOTVS, SAP, Omie, Conta Azul) =====

  // Ativo — variações adicionais
  "TOTAL GERAL DO ATIVO": "Ativo Total",
  "SOMA DO ATIVO": "Ativo Total",
  "TOTAL DOS ATIVOS": "Ativo Total",
  "TOTAL ATIVO CIRCULANTE": "Ativo Circulante",
  "TOTAL DO ATIVO CIRCULANTE": "Ativo Circulante",
  "NUMERARIO EM CAIXA": "Caixa e Equivalentes de Caixa",
  "NUMERÁRIOS EM CAIXA": "Caixa e Equivalentes de Caixa",
  "CAIXA GERAL": "Caixa e Equivalentes de Caixa",
  "CAIXA FILIAL": "Caixa e Equivalentes de Caixa",
  "BANCOS CONTA CORRENTE": "Caixa e Equivalentes de Caixa",
  "BANCO DO BRASIL": "Caixa e Equivalentes de Caixa",
  "BANCO BRADESCO": "Caixa e Equivalentes de Caixa",
  "BANCO ITAU": "Caixa e Equivalentes de Caixa",
  "BANCO SANTANDER": "Caixa e Equivalentes de Caixa",
  "BANCO INTER": "Caixa e Equivalentes de Caixa",
  "BANCO SICOOB": "Caixa e Equivalentes de Caixa",
  "BANCO SICREDI": "Caixa e Equivalentes de Caixa",
  "BANCOS - CONTA VINCULADA": "Caixa e Equivalentes de Caixa",

  // Aplicações Financeiras — variações
  "APLICAÇÃO FINANCEIRA": "Aplicações Financeiras",
  "APLICAÇÕES DE RENDA FIXA": "Aplicações Financeiras",
  "CDB": "Aplicações Financeiras",
  "LCI": "Aplicações Financeiras",
  "LCA": "Aplicações Financeiras",
  "POUPANÇA": "Aplicações Financeiras",

  // Contas a Receber — variações
  "CLIENTES": "Contas a Receber",
  "CONTAS A RECEBER": "Contas a Receber",
  "CONTAS A RECEBER DE CLIENTES": "Contas a Receber",
  "TITULOS A RECEBER": "Contas a Receber",
  "DUPLICATAS A RECEBER DE CLIENTES": "Contas a Receber",
  "CREDITOS COM CLIENTES": "Contas a Receber",
  "VALORES A RECEBER": "Contas a Receber",
  "RECEBIVEIS": "Contas a Receber",

  // Estoques — variações
  "ESTOQUE DE MERCADORIAS": "Estoques",
  "ESTOQUE DE PRODUTOS": "Estoques",
  "ESTOQUE DE MATERIA PRIMA": "Estoques",
  "MERCADORIAS PARA REVENDA": "Estoques",
  "PRODUTOS EM ELABORAÇÃO": "Estoques",
  "PRODUTOS EM ELABORACAO": "Estoques",
  "MATERIAIS DE CONSUMO": "Estoques",
  "ALMOXARIFADO": "Estoques",
  "MERCADORIAS EM ESTOQUE": "Estoques",

  // Tributos a Recuperar — variações
  "TRIBUTOS A RECUPERAR": "Tributos a Recuperar",
  "IMPOSTOS A COMPENSAR": "Tributos a Recuperar",
  "IPI A RECUPERAR": "Tributos a Recuperar",
  "IRPJ A RECUPERAR": "Tributos a Recuperar",
  "CSLL A RECUPERAR": "Tributos a Recuperar",
  "IRRF A RECUPERAR": "Tributos a Recuperar",
  "COFINS A RECUPERAR": "Tributos a Recuperar",
  "CREDITOS FISCAIS": "Tributos a Recuperar",
  "TRIBUTOS A COMPENSAR": "Tributos a Recuperar",

  // Outros Ativos Circulantes — variações
  "ADIANTAMENTOS A FORNECEDORES": "Outros Ativos Circulantes",
  "ADIANTAMENTOS A EMPREGADOS": "Outros Ativos Circulantes",
  "ADIANTAMENTO A FUNCIONARIOS": "Outros Ativos Circulantes",
  "ADIANTAMENTO DE SALARIOS": "Outros Ativos Circulantes",
  "SEGUROS A APROPRIAR": "Outros Ativos Circulantes",
  "VALORES A COMPENSAR": "Outros Ativos Circulantes",
  "OUTROS CREDITOS": "Outros Ativos Circulantes",
  "DEPOSITOS BANCARIOS": "Outros Ativos Circulantes",

  // ANC — variações
  "TOTAL DO ATIVO NÃO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "TOTAL DO ATIVO NAO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "NÃO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "NAO CIRCULANTE": "Ativo Realizável a Longo Prazo",
  "ATIVO A LONGO PRAZO": "Ativo Realizável a Longo Prazo",

  // Imobilizado — variações
  "ATIVO FIXO": "Imobilizado - ALP",
  "BENS DO IMOBILIZADO": "Imobilizado - ALP",
  "IMOBILIZADO LIQUIDO": "Imobilizado - ALP",
  "MAQUINAS E EQUIPAMENTOS": "Imobilizado - ALP",
  "VEICULOS": "Imobilizado - ALP",
  "MOVEIS E UTENSILIOS": "Imobilizado - ALP",
  "EDIFICAÇÕES": "Imobilizado - ALP",
  "TERRENOS": "Imobilizado - ALP",
  "(-) DEPRECIAÇÃO ACUMULADA": "Imobilizado - ALP",
  "DEPRECIACAO ACUMULADA": "Imobilizado - ALP",

  // Passivo — variações adicionais
  "TOTAL GERAL DO PASSIVO": "Passivo Total",
  "SOMA DO PASSIVO": "Passivo Total",
  "TOTAL DOS PASSIVOS": "Passivo Total",
  "TOTAL PASSIVO E PATRIMÔNIO LÍQUIDO": "Passivo Total",
  "TOTAL PASSIVO E PATRIMONIO LIQUIDO": "Passivo Total",
  "TOTAL DO PASSIVO CIRCULANTE": "Passivo Circulante",
  "TOTAL PASSIVO CIRCULANTE": "Passivo Circulante",
  "TOTAL DO PASSIVO NÃO CIRCULANTE": "Passivo Não Circulante",
  "TOTAL DO PASSIVO NAO CIRCULANTE": "Passivo Não Circulante",

  // Fornecedores — variações
  "FORNECEDORES A PAGAR": "Fornecedores",
  "FORNECEDORES NACIONAIS": "Fornecedores",
  "DUPLICATAS A PAGAR": "Fornecedores",

  // Obrigações Fiscais — variações adicionais
  "IMPOSTOS A PAGAR": "Obrigações Fiscais",
  "IMPOSTOS E CONTRIBUIÇÕES A RECOLHER": "Obrigações Fiscais",
  "OBRIGAÇÕES TRIBUTÁRIAS": "Obrigações Fiscais",
  "OBRIGACOES FISCAIS": "Obrigações Fiscais",
  "ICMS A PAGAR": "Obrigações Fiscais",
  "ICMS A RECOLHER": "Obrigações Fiscais",
  "ISS A PAGAR": "Obrigações Fiscais",
  "PIS A RECOLHER": "Obrigações Fiscais",
  "COFINS A RECOLHER": "Obrigações Fiscais",
  "IRPJ A PAGAR": "Obrigações Fiscais",
  "CSLL A PAGAR": "Obrigações Fiscais",
  "SIMPLES NACIONAL A RECOLHER": "Obrigações Fiscais",

  // Obrigações Trabalhistas — variações adicionais
  "SALARIOS E ORDENADOS A PAGAR": "Obrigações Sociais e Trabalhistas",
  "SALÁRIOS A PAGAR": "Obrigações Sociais e Trabalhistas",
  "INSS A RECOLHER": "Obrigações Sociais e Trabalhistas",
  "FGTS A RECOLHER": "Obrigações Sociais e Trabalhistas",
  "FÉRIAS A PAGAR": "Obrigações Sociais e Trabalhistas",
  "PROVISAO FERIAS": "Obrigações Sociais e Trabalhistas",
  "PROVISÃO DE FÉRIAS": "Obrigações Sociais e Trabalhistas",
  "PROVISAO 13o SALARIO": "Obrigações Sociais e Trabalhistas",
  "PROVISÃO 13º SALÁRIO": "Obrigações Sociais e Trabalhistas",
  "13o SALARIO A PAGAR": "Obrigações Sociais e Trabalhistas",
  "OBRIGAÇÕES SOCIAIS": "Obrigações Sociais e Trabalhistas",
  "ENCARGOS SOCIAIS A PAGAR": "Obrigações Sociais e Trabalhistas",

  // Empréstimos — variações adicionais
  "FINANCIAMENTOS BANCARIOS": "Empréstimos e Financiamentos",
  "EMPRESTIMOS A PAGAR": "Empréstimos e Financiamentos",
  "EMPRESTIMOS BANCARIOS CP": "Empréstimos e Financiamentos",
  "FINANCIAMENTOS CP": "Empréstimos e Financiamentos",
  "EMPRESTIMOS BANCARIOS LP": "Empréstimos e Financiamentos - PLP",
  "FINANCIAMENTOS LP": "Empréstimos e Financiamentos - PLP",
  "EMPRÉSTIMOS E FINANCIAMENTOS LP": "Empréstimos e Financiamentos - PLP",
  "EMPRESTIMOS E FINANCIAMENTOS LP": "Empréstimos e Financiamentos - PLP",
  "FINANCIAMENTOS A LONGO PRAZO": "Empréstimos e Financiamentos - PLP",

  // PL — variações adicionais
  "TOTAL DO PATRIMÔNIO LÍQUIDO": "Patrimônio Líquido",
  "TOTAL DO PATRIMONIO LIQUIDO": "Patrimônio Líquido",
  "TOTAL PATRIMÔNIO LÍQUIDO": "Patrimônio Líquido",
  "PL": "Patrimônio Líquido",
  "CAPITAL SOCIAL INTEGRALIZADO": "Capital Social Realizado",
  "CAPITAL INTEGRALIZADO": "Capital Social Realizado",
  "CAPITAL REALIZADO": "Capital Social Realizado",
  "CAPITAL SUBSCRITO E INTEGRALIZADO": "Capital Social Realizado",
  "RESERVA LEGAL": "Reservas de Lucros",
  "RESERVA DE LUCROS": "Reservas de Lucros",
  "RESERVAS ESTATUTÁRIAS": "Reservas de Lucros",
  "RESULTADO DO EXERCICIO ANTERIOR": "Lucros/Prejuízos Acumulados",
  "LUCROS ACUMULADOS": "Lucros/Prejuízos Acumulados",
  "PREJUÍZOS ACUMULADOS": "Lucros/Prejuízos Acumulados",
  "PREJUIZOS ACUMULADOS": "Lucros/Prejuízos Acumulados",
  "RESULTADO ACUMULADO": "Lucros/Prejuízos Acumulados",
  "LUCRO DO EXERCICIO": "Lucros/Prejuízos Acumulados",
  "LUCRO OU PREJUIZO ACUMULADO": "Lucros/Prejuízos Acumulados",

  // DRE — variações adicionais
  "RECEITA OPERACIONAL BRUTA": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA BRUTA DE VENDAS": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA BRUTA DE SERVIÇOS": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA BRUTA DE SERVICOS": "Receita Bruta de Vendas e/ou Serviços",
  "VENDAS DE MERCADORIAS": "Receita Bruta de Vendas e/ou Serviços",
  "VENDAS DE PRODUTOS": "Receita Bruta de Vendas e/ou Serviços",
  "PRESTAÇÃO DE SERVIÇOS": "Receita Bruta de Vendas e/ou Serviços",
  "PRESTACAO DE SERVICOS": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITA DE VENDAS": "Receita Bruta de Vendas e/ou Serviços",
  "RECEITAS OPERACIONAIS": "Receita Bruta de Vendas e/ou Serviços",
  "FATURAMENTO": "Receita Bruta de Vendas e/ou Serviços",

  "DEDUÇÕES DA RECEITA": "Deduções da Receita Bruta",
  "DEDUCOES DA RECEITA": "Deduções da Receita Bruta",
  "IMPOSTOS SOBRE VENDAS": "Deduções da Receita Bruta",
  "TRIBUTOS SOBRE VENDAS": "Deduções da Receita Bruta",
  "IMPOSTOS INCIDENTES SOBRE VENDAS": "Deduções da Receita Bruta",
  "DEVOLUÇÕES DE VENDAS": "Deduções da Receita Bruta",
  "DEVOLUCOES DE VENDAS": "Deduções da Receita Bruta",
  "ABATIMENTOS SOBRE VENDAS": "Deduções da Receita Bruta",
  "CANCELAMENTOS": "Deduções da Receita Bruta",

  "RECEITA OPERACIONAL LÍQUIDA": "Receita Líquida",
  "RECEITA OPERACIONAL LIQUIDA": "Receita Líquida",
  "RECEITA LÍQUIDA DE VENDAS": "Receita Líquida",
  "RECEITA LIQ. DE VENDAS E SERVIÇOS": "Receita Líquida",

  "CUSTO DAS MERCADORIAS VENDIDAS": "Custo Operacional",
  "CUSTO DOS SERVIÇOS PRESTADOS": "Custo Operacional",
  "CUSTO DOS SERVICOS PRESTADOS": "Custo Operacional",
  "CUSTO DAS VENDAS": "Custo Operacional",
  "CMV/CPV/CSP": "Custo Operacional",
  "CUSTOS OPERACIONAIS": "Custo Operacional",
  "CUSTO DE VENDAS": "Custo Operacional",
  "CUSTO DAS MERCADORIAS": "Custo Operacional",
  "CUSTO DOS PRODUTOS": "Custo Operacional",

  "LUCRO BRUTO": "Resultado Bruto",
  "MARGEM BRUTA": "Resultado Bruto",
  "RESULTADO OPERACIONAL BRUTO": "Resultado Bruto",

  "DESPESAS ADMINISTRATIVAS": "Despesas Gerais e Administrativas",
  "DESPESAS GERAIS E ADMINISTRATIVAS": "Despesas Gerais e Administrativas",
  "DESPESAS ADMINISTRATIVAS E GERAIS": "Despesas Gerais e Administrativas",
  "DESPESAS COM PESSOAL": "Despesas Gerais e Administrativas",
  "DESPESAS DE PESSOAL": "Despesas Gerais e Administrativas",

  "DESPESAS DE VENDAS": "Despesas Com Vendas",
  "DESPESAS COM VENDAS": "Despesas Com Vendas",

  "RESULTADO ANTES DO IRPJ E CSLL": "Resultado Antes Tributação/Participações",
  "LUCRO ANTES DOS TRIBUTOS": "Resultado Antes Tributação/Participações",
  "LUCRO ANTES DO IR": "Resultado Antes Tributação/Participações",
  "LUCRO ANTES DO IRPJ": "Resultado Antes Tributação/Participações",
  "RESULTADO ANTES DOS TRIBUTOS": "Resultado Antes Tributação/Participações",
  "RESULTADO ANTES DOS IMPOSTOS": "Resultado Antes Tributação/Participações",

  "PROVISÃO PARA IRPJ": "Provisão para IR e Contribuição Social",
  "PROVISAO PARA IR": "Provisão para IR e Contribuição Social",
  "IRPJ E CSLL": "Provisão para IR e Contribuição Social",
  "IMPOSTOS SOBRE O LUCRO": "Provisão para IR e Contribuição Social",

  "LUCRO LIQUIDO": "Lucro ou Prejuízo do Período",
  "LUCRO LÍQUIDO": "Lucro ou Prejuízo do Período",
  "LUCRO LIQUIDO DO EXERCICIO": "Lucro ou Prejuízo do Período",
  "LUCRO LÍQUIDO DO EXERCÍCIO": "Lucro ou Prejuízo do Período",
  "PREJUIZO DO EXERCICIO": "Lucro ou Prejuízo do Período",
  "PREJUÍZO DO EXERCÍCIO": "Lucro ou Prejuízo do Período",
  "RESULTADO DO PERIODO": "Lucro ou Prejuízo do Período",
  "RESULTADO DO PERÍODO": "Lucro ou Prejuízo do Período",
  "RESULTADO LÍQUIDO DO EXERCÍCIO": "Lucro ou Prejuízo do Período",
};

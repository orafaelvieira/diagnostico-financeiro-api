import type { BPLineItem, DRELineItem, Indicador } from "../types/financial";
import { INDICADORES_TEMPLATE } from "./financial-templates";

// Helper to find a BP value by conta name
function bpVal(bp: BPLineItem[], conta: string, periodo: string): number {
  const item = bp.find(b => b.conta === conta);
  return item?.valores[periodo] ?? 0;
}

// Helper to sum BP values by classificacao
function bpByClass(bp: BPLineItem[], classificacao: string, periodo: string): number {
  return bp
    .filter(b => b.classificacao === classificacao)
    .reduce((sum, b) => sum + (b.valores[periodo] ?? 0), 0);
}

// Helper to find a DRE value by conta name
function dreVal(dre: DRELineItem[], conta: string, periodo: string): number {
  const item = dre.find(d => d.conta === conta);
  return item?.valores[periodo] ?? 0;
}

// Safe division — returns null on divide by zero
function div(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

type StatusLevel = "ok" | "atencao" | "critico" | null;

interface ThresholdConfig {
  critico: (v: number) => boolean;
  atencao: (v: number) => boolean;
}

const THRESHOLDS: Record<string, ThresholdConfig> = {
  "Liquidez Imediata": { critico: v => v < 0.2, atencao: v => v < 0.5 },
  "Liquidez Seca": { critico: v => v < 0.7, atencao: v => v < 1.0 },
  "Liquidez Corrente": { critico: v => v < 1.0, atencao: v => v < 1.5 },
  "Liquidez Geral": { critico: v => v < 0.8, atencao: v => v < 1.2 },
  "Margem Bruta": { critico: v => v < 0.10, atencao: v => v < 0.30 },
  "Margem Operacional": { critico: v => v < 0, atencao: v => v < 0.05 },
  "Margem Líquida": { critico: v => v < 0, atencao: v => v < 0.05 },
  "Endividamento Geral": { critico: v => v > 0.80, atencao: v => v > 0.50 },
  "Endividamento de Curto Prazo": { critico: v => v > 0.70, atencao: v => v > 0.50 },
  "ROA (Retorno sobre Ativos)": { critico: v => v < 0, atencao: v => v < 0.05 },
  "ROIC (Retorno sobre Capital Investido)": { critico: v => v < 0, atencao: v => v < 0.08 },
  "ROE (Retorno sobre Patrimônio Líquido)": { critico: v => v < 0, atencao: v => v < 0.10 },
  "Índice de Cobertura de Juros": { critico: v => v < 1.5, atencao: v => v < 3.0 },
  "Capital Terceiros s/ PL": { critico: v => v > 2.0, atencao: v => v > 1.0 },
  "Despesa Financeira / Rec. Líquida": { critico: v => v > 0.10, atencao: v => v > 0.05 },
};

function getStatus(nome: string, value: number | null): StatusLevel {
  if (value === null) return null;
  const threshold = THRESHOLDS[nome];
  if (!threshold) return null;
  if (threshold.critico(value)) return "critico";
  if (threshold.atencao(value)) return "atencao";
  return "ok";
}

function computeIndicator(
  nome: string,
  bp: BPLineItem[],
  dre: DRELineItem[],
  periodo: string,
  computed: Record<string, number | null>
): number | string | null {
  // BP values — Ativo (always positive)
  const ativoTotal = bpVal(bp, "Ativo Total", periodo);
  const ativoCirculante = bpVal(bp, "Ativo Circulante", periodo);
  const caixa = bpVal(bp, "Caixa e Equivalentes de Caixa", periodo);
  const contasReceber = bpVal(bp, "Contas a Receber", periodo);
  const estoques = bpVal(bp, "Estoques", periodo);
  const realizavelLP = bpVal(bp, "Realizável a Longo Prazo", periodo);

  // BP values — Passivo e PL: normalize signs (some accounting systems store these as negative)
  const passivoTotal = Math.abs(bpVal(bp, "Passivo Total", periodo));
  const passivoCirculante = Math.abs(bpVal(bp, "Passivo Circulante", periodo));
  const passivoNaoCirculante = Math.abs(bpVal(bp, "Passivo Não Circulante", periodo));
  const fornecedores = Math.abs(bpVal(bp, "Fornecedores", periodo));
  const empFinCP = Math.abs(bpVal(bp, "Empréstimos e Financiamentos - Curto Prazo", periodo));
  const passPartRelCP = Math.abs(bpVal(bp, "Passivos com Partes Relacionadas - Curto Prazo", periodo));
  const empFinLP = Math.abs(bpVal(bp, "Empréstimos e Financiamentos - Longo Prazo", periodo));
  const passPartRelLP = Math.abs(bpVal(bp, "Passivos com Partes Relacionadas - Longo Prazo", periodo));
  const patrimonioLiquido = Math.abs(bpVal(bp, "Patrimônio Líquido", periodo));

  // Aggregated by classification (abs for Passivo side)
  const ativoOperacional = bpByClass(bp, "AO", periodo);
  const passivoOperacional = Math.abs(bpByClass(bp, "PO", periodo));

  // DRE raw values
  const recBruta = dreVal(dre, "Receita Bruta de Vendas e/ou Serviços", periodo);
  const deducoes = dreVal(dre, "Deduções da Receita Bruta", periodo);
  const custoOp = dreVal(dre, "Custo Operacional", periodo);
  const despGerais = dreVal(dre, "Despesas Gerais e Administrativas", periodo);
  const despVendas = dreVal(dre, "Despesas Com Vendas", periodo);
  const perdasNaoRecup = dreVal(dre, "Perdas pela Não Recuperabilidade de Ativos", periodo);
  const outrasRecOp = dreVal(dre, "Outras Receitas Operacionais", periodo);
  const outrasDespOp = dreVal(dre, "Outras Despesas Operacionais", periodo);
  const despesasFinanceiras = dreVal(dre, "Despesas Financeiras", periodo);
  const receitasFinanceiras = dreVal(dre, "Receitas Financeiras", periodo);
  const resNaoOp = dreVal(dre, "Resultado Não Operacional", periodo);
  const provisaoIR = dreVal(dre, "Provisão para IR e Contribuição Social", periodo);
  const lucroPrejuizo = dreVal(dre, "Lucro ou Prejuízo do Período", periodo);

  // DRE computed subtotals (use extracted value if available, otherwise compute)
  const receitaLiquida = dreVal(dre, "Receita Líquida", periodo) || (recBruta + deducoes);
  const resultadoBruto = dreVal(dre, "Resultado Bruto", periodo) || (receitaLiquida + custoOp);
  const resultadoOperacional = dreVal(dre, "Resultado Operacional", periodo) ||
    (resultadoBruto + despGerais + despVendas + perdasNaoRecup + outrasRecOp + outrasDespOp);
  const custoOperacional = Math.abs(custoOp);

  // Computed intermediate values
  const capitalTerceiros = empFinCP + passPartRelCP + empFinLP + passPartRelLP;
  const caixaEquivalentes = caixa;
  const dividaLiquida = capitalTerceiros - caixaEquivalentes;
  const nopat = resultadoOperacional * (1 - 0.34);
  const cdg = ativoCirculante - passivoCirculante;
  const ncg = ativoOperacional - passivoOperacional;

  // Store computed values for cross-reference
  computed["Receita Líquida"] = receitaLiquida;
  computed["Lucro Bruto"] = resultadoBruto;
  computed["Lucro Operacional"] = resultadoOperacional;
  computed["Lucro Líquido"] = lucroPrejuizo;
  computed["NOPAT"] = nopat;
  computed["Caixa e Equivalentes"] = caixaEquivalentes;
  computed["Capital de Terceiros"] = capitalTerceiros;
  computed["Dívida Líquida"] = dividaLiquida;
  computed["Capital de Giro (CDG)"] = cdg;
  computed["Necessidade de Capital de Giro (NCG)"] = ncg;

  switch (nome) {
    // Operacionais
    case "Receita Líquida": return receitaLiquida;
    case "Lucro Bruto": return resultadoBruto;
    case "Lucro Operacional": return resultadoOperacional;
    case "Lucro Líquido": return lucroPrejuizo;
    case "NOPAT": return nopat;

    // Margens
    case "Margem Bruta": return div(resultadoBruto, receitaLiquida);
    case "Margem Operacional": return div(resultadoOperacional, receitaLiquida);
    case "Margem Líquida": return div(lucroPrejuizo, receitaLiquida);

    // Liquidez
    case "Liquidez Imediata": return div(caixa, passivoCirculante);
    case "Liquidez Seca": return div(ativoCirculante - estoques, passivoCirculante);
    case "Liquidez Corrente": return div(ativoCirculante, passivoCirculante);
    case "Liquidez Geral":
      return div(ativoCirculante + realizavelLP, passivoCirculante + passivoNaoCirculante);

    // Capital de Giro
    case "Capital de Giro (CDG)": return cdg;
    case "Necessidade de Capital de Giro (NCG)": return ncg;
    case "Saldo em Tesouraria (ST)": return cdg - ncg;
    case "Situação da empresa": {
      if (cdg > 0 && ncg > 0 && cdg > ncg) return "Sólida";
      if (cdg > 0 && ncg > 0 && cdg < ncg) return "Insuficiente";
      if (cdg < 0 && ncg < 0) return "Alto Risco";
      if (cdg > 0 && ncg < 0) return "Excelente";
      if (cdg < 0 && ncg > 0) return "Muito Ruim";
      return "Indefinida";
    }
    case "Prazo Médio Contas a Receber":
      return receitaLiquida ? Math.round((contasReceber * 365) / receitaLiquida) : null;
    case "Prazo Médio Estoque":
      return custoOperacional ? Math.round((estoques * 365) / custoOperacional) : null;
    case "Prazo Médio Fornecedores":
      return custoOperacional ? Math.round((fornecedores * 365) / custoOperacional) : null;
    case "Ciclo Financeiro": {
      const pmr = receitaLiquida ? Math.round((contasReceber * 365) / receitaLiquida) : null;
      const pme = custoOperacional ? Math.round((estoques * 365) / custoOperacional) : null;
      const pmf = custoOperacional ? Math.round((fornecedores * 365) / custoOperacional) : null;
      if (pmr !== null && pme !== null && pmf !== null) return pmr + pme - pmf;
      return null;
    }

    // Endividamento
    case "Caixa e Equivalentes": return caixaEquivalentes;
    case "Capital de Terceiros": return capitalTerceiros;
    case "Dívida Líquida": return dividaLiquida;
    case "Endividamento Geral": return div(passivoTotal - patrimonioLiquido, passivoTotal);
    case "Endividamento de Curto Prazo": return div(passivoCirculante, passivoTotal);
    case "Patrimônio Líquido": return patrimonioLiquido;
    case "Capital Terceiros s/ PL": return div(capitalTerceiros, patrimonioLiquido);
    case "Dívida Líquida/Lucro Operacional": return div(dividaLiquida, resultadoOperacional);
    case "Índice de Cobertura de Juros":
      return despesasFinanceiras !== 0 ? div(resultadoOperacional, Math.abs(despesasFinanceiras)) : null;
    case "Despesa Financeira / Rec. Líquida":
      return div(Math.abs(despesasFinanceiras), receitaLiquida);

    // Rentabilidade
    case "ROA (Retorno sobre Ativos)": return div(lucroPrejuizo, ativoTotal);
    case "ROIC (Retorno sobre Capital Investido)":
      return div(nopat, patrimonioLiquido + capitalTerceiros);

    // DuPont
    case "ROE (Retorno sobre Patrimônio Líquido)": return div(lucroPrejuizo, patrimonioLiquido);
    case "Giro do Ativo": return div(receitaLiquida, ativoTotal);
    case "Alavancagem": return div(passivoTotal, patrimonioLiquido);

    default: return null;
  }
}

export function calculateIndicators(
  bp: BPLineItem[],
  dre: DRELineItem[],
  periodos: string[]
): Indicador[] {
  return INDICADORES_TEMPLATE.map(template => {
    const valores: Record<string, number | string | null> = {};
    const status: Record<string, StatusLevel> = {};
    const computed: Record<string, number | null> = {};

    for (const periodo of periodos) {
      const val = computeIndicator(template.nome, bp, dre, periodo, computed);
      valores[periodo] = val;

      // Status only for numeric values
      if (typeof val === "number") {
        status[periodo] = getStatus(template.nome, val);
      } else {
        status[periodo] = null;
      }
    }

    return {
      tipo: template.tipo,
      nome: template.nome,
      formula: template.formula,
      tipoDado: template.tipoDado,
      valores,
      status,
      overrides: {},
    };
  });
}

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { ParsedDocument } from "./parser";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

export interface AnalysisResult {
  kpis: {
    receita:          { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    margemBruta:      { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    ebitda:           { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    margemEbitda:     { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    liquidezCorrente: { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    endividamento:    { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    roe:              { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
    roa:              { valor: number; variacao: number; status: "ok" | "atencao" | "critico" };
  };
  capitalDeGiro?: number;
  liquidezSeca?: number;
  margemLiquida?: number;
  divLiqEbitda?: number;
  coberturaJuros?: number;
  dreData: Array<{
    mes: string;
    receita: number;
    custos: number;
    bruto: number;
    operacional: number;
    liquido: number;
  }>;
  semaforo: Array<{ area: string; status: "ok" | "atencao" | "critico"; descricao: string }>;
  recomendacoes: Array<{
    titulo: string;
    prioridade: "Alta" | "Média" | "Baixa";
    impacto: string;
    esforco: string;
    horizonte: string;
    descricao: string;
  }>;
  swot: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    riscos: string[];
  };
  confianca: number;
  destaques: string[];
}

export async function generateAnalysis(
  documents: ParsedDocument[],
  empresa: { razaoSocial: string; setor: string; porte: string },
  periodo: string
): Promise<AnalysisResult> {
  const docsText = documents.map((d) => `\n=== ${d.tipo} ===\n${d.raw}`).join("\n\n");

  // Detect which document types are available
  const tipos = documents.map((d) => d.tipo.toLowerCase());
  const temDRE = tipos.some((t) => t.includes("dre") || t.includes("demonstra"));
  const temBP = tipos.some((t) => t.includes("balan"));
  const temBalancete = tipos.some((t) => t.includes("balancete"));

  const prompt = `Você é um especialista em análise financeira de empresas brasileiras.

Analise os dados financeiros abaixo da empresa "${empresa.razaoSocial}" (Setor: ${empresa.setor}, Porte: ${empresa.porte}, Período: ${periodo}).

DOCUMENTOS DISPONÍVEIS: ${documents.map((d) => d.tipo).join(", ")}

${docsText}

IMPORTANTE — Análise com dados parciais:
- Se APENAS o Balanço Patrimonial estiver disponível (sem DRE), calcule o que for possível: liquidez corrente, endividamento, capital de giro, ROE e ROA (usando lucros/prejuízos acumulados como proxy).
- Para métricas que PRECISAM da DRE e ela NÃO foi fornecida (receita, margemBruta, ebitda, margemEbitda), use valor=0 e status="critico" — isso indicará ao frontend que o dado não está disponível.
- Se o Balancete estiver disponível, extraia dados de receita, custos e despesas dele (o balancete contém contas de resultado).
- dreData: preencha SOMENTE se tiver dados de receita/custos por período. Se não tiver, retorne array vazio [].
- Faça o MÁXIMO possível com os dados disponíveis. Cada número deve ser calculado, não inventado.

Cálculos esperados a partir do Balanço Patrimonial:
- Liquidez Corrente = Ativo Circulante / Passivo Circulante (valor absoluto)
- Endividamento (Dívida/PL) = (Passivo Circulante + Passivo Não Circulante) / |Patrimônio Líquido|
- Capital de Giro = Ativo Circulante - Passivo Circulante (em R$)
- ROE = Lucro Líquido (ou Lucros Acumulados do período) / |Patrimônio Líquido| × 100 (%)
- ROA = Lucro Líquido (ou Lucros Acumulados do período) / Ativo Total × 100 (%)
- Liquidez Seca = (Ativo Circulante - Estoques) / Passivo Circulante (se não houver estoques, igual à Liquidez Corrente)

ATENÇÃO: Os valores do passivo/PL podem estar com sinal negativo na contabilidade brasileira. Use VALOR ABSOLUTO quando necessário para os cálculos de índices.

Retorne APENAS um JSON válido (sem markdown, sem explicação, sem \`\`\`) com EXATAMENTE esta estrutura:

{
  "kpis": {
    "receita":          { "valor": <receita_liquida_total_em_reais_ou_0>, "variacao": <variacao_pct_ou_0>, "status": "ok|atencao|critico" },
    "margemBruta":      { "valor": <margem_bruta_percentual_ou_0>, "variacao": <variacao_pp_ou_0>, "status": "ok|atencao|critico" },
    "ebitda":           { "valor": <ebitda_em_reais_ou_0>, "variacao": <variacao_pct_ou_0>, "status": "ok|atencao|critico" },
    "margemEbitda":     { "valor": <margem_ebitda_percentual_ou_0>, "variacao": <variacao_pp_ou_0>, "status": "ok|atencao|critico" },
    "liquidezCorrente": { "valor": <indice_decimal>, "variacao": <variacao_ou_0>, "status": "ok|atencao|critico" },
    "endividamento":    { "valor": <divida_sobre_pl_decimal>, "variacao": <variacao_ou_0>, "status": "ok|atencao|critico" },
    "roe":              { "valor": <roe_percentual>, "variacao": <variacao_pp_ou_0>, "status": "ok|atencao|critico" },
    "roa":              { "valor": <roa_percentual>, "variacao": <variacao_pp_ou_0>, "status": "ok|atencao|critico" }
  },
  "capitalDeGiro": <ativo_circulante_menos_passivo_circulante_em_reais_ou_null>,
  "liquidezSeca": <indice_decimal_ou_null>,
  "margemLiquida": <percentual_ou_null>,
  "divLiqEbitda": <indice_decimal_ou_null>,
  "coberturaJuros": <indice_decimal_ou_null>,
  "dreData": [
    { "mes": "Jan", "receita": <R$_mil>, "custos": <R$_mil>, "bruto": <R$_mil>, "operacional": <R$_mil>, "liquido": <R$_mil> }
  ],
  "semaforo": [
    { "area": "Receita e Crescimento", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo_uma_frase>" },
    { "area": "Margens Operacionais", "status": "ok|atencao|critico", "descricao": "<resumo>" },
    { "area": "Liquidez", "status": "ok|atencao|critico", "descricao": "<resumo_com_valor_calculado>" },
    { "area": "Endividamento", "status": "ok|atencao|critico", "descricao": "<resumo_com_valor_calculado>" },
    { "area": "Rentabilidade", "status": "ok|atencao|critico", "descricao": "<resumo_com_valor_calculado>" },
    { "area": "Capital de Giro", "status": "ok|atencao|critico", "descricao": "<resumo_com_valor_calculado>" }
  ],
  "recomendacoes": [
    { "titulo": "<acao_concreta>", "prioridade": "Alta|Média|Baixa", "impacto": "Alto|Médio|Baixo", "esforco": "Alto|Médio|Baixo", "horizonte": "0–30d|30–90d|90–180d", "descricao": "<detalhe_pratico>" }
  ],
  "swot": {
    "forcas":        ["<forca_1>", "<forca_2>", "<forca_3>"],
    "fraquezas":     ["<fraqueza_1>", "<fraqueza_2>", "<fraqueza_3>"],
    "oportunidades": ["<oportunidade_1>", "<oportunidade_2>", "<oportunidade_3>"],
    "riscos":        ["<risco_1>", "<risco_2>", "<risco_3>"]
  },
  "confianca": <0_a_100_baseado_na_completude_dos_dados>,
  "destaques": ["<insight_chave_1>", "<insight_chave_2>", "<insight_chave_3>", "<insight_chave_4>"]
}

Regras:
- Use apenas os dados fornecidos. Se um KPI não pode ser calculado, use valor 0.
- capitalDeGiro, liquidezSeca, margemLiquida, divLiqEbitda, coberturaJuros: use null se não puder calcular.
- dreData: valores em R$ mil (divida por 1000). Array vazio se não houver dados de DRE.
- confianca: 30-50 se só tem Balanço Patrimonial, 50-70 se só tem DRE, 70-100 se tem ambos.
- Mínimo 3 recomendações, máximo 6. Devem ser práticas e específicas para a empresa.
- destaques: frases curtas e objetivas (max 15 palavras cada).
- semaforo descricao: inclua o valor numérico calculado quando possível.
- Responda APENAS com o JSON, sem markdown.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  let text = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const result: AnalysisResult = JSON.parse(text);
  return result;
}

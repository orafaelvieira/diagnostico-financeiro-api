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

  const prompt = `Você é um especialista em análise financeira de empresas brasileiras.

Analise os dados financeiros abaixo da empresa "${empresa.razaoSocial}" (Setor: ${empresa.setor}, Porte: ${empresa.porte}, Período: ${periodo}).

${docsText}

Retorne APENAS um JSON válido (sem markdown, sem explicação) com EXATAMENTE esta estrutura:

{
  "kpis": {
    "receita":          { "valor": <receita_liquida_total_em_reais>, "variacao": <variacao_percentual_vs_periodo_anterior_ou_0>, "status": "ok|atencao|critico" },
    "margemBruta":      { "valor": <margem_bruta_percentual>, "variacao": <variacao_pp>, "status": "ok|atencao|critico" },
    "ebitda":           { "valor": <ebitda_em_reais>, "variacao": <variacao_percentual>, "status": "ok|atencao|critico" },
    "margemEbitda":     { "valor": <margem_ebitda_percentual>, "variacao": <variacao_pp>, "status": "ok|atencao|critico" },
    "liquidezCorrente": { "valor": <indice>, "variacao": <variacao>, "status": "ok|atencao|critico" },
    "endividamento":    { "valor": <divida_sobre_pl>, "variacao": <variacao>, "status": "ok|atencao|critico" },
    "roe":              { "valor": <roe_percentual>, "variacao": <variacao_pp>, "status": "ok|atencao|critico" },
    "roa":              { "valor": <roa_percentual>, "variacao": <variacao_pp>, "status": "ok|atencao|critico" }
  },
  "dreData": [
    { "mes": "Jan", "receita": <valor_em_mil>, "custos": <valor_em_mil>, "bruto": <valor_em_mil>, "operacional": <valor_em_mil>, "liquido": <valor_em_mil> }
  ],
  "semaforo": [
    { "area": "Receita e Crescimento", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" },
    { "area": "Margens Operacionais", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" },
    { "area": "Liquidez", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" },
    { "area": "Endividamento", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" },
    { "area": "Rentabilidade", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" },
    { "area": "Capital de Giro", "status": "ok|atencao|critico", "descricao": "<resumo_objetivo>" }
  ],
  "recomendacoes": [
    { "titulo": "<acao_concreta>", "prioridade": "Alta|Média|Baixa", "impacto": "Alto|Médio|Baixo", "esforco": "Alto|Médio|Baixo", "horizonte": "0–30d|30–90d|90–180d", "descricao": "<detalhe>" }
  ],
  "swot": {
    "forcas":        ["<forca_1>", "<forca_2>", "<forca_3>"],
    "fraquezas":     ["<fraqueza_1>", "<fraqueza_2>", "<fraqueza_3>"],
    "oportunidades": ["<oportunidade_1>", "<oportunidade_2>", "<oportunidade_3>"],
    "riscos":        ["<risco_1>", "<risco_2>", "<risco_3>"]
  },
  "confianca": <numero_de_0_a_100_baseado_na_qualidade_dos_dados>,
  "destaques": ["<insight_chave_1>", "<insight_chave_2>", "<insight_chave_3>", "<insight_chave_4>"]
}

Regras:
- Use apenas os dados fornecidos. Se um dado não estiver disponível, use 0.
- dreData: valores em R$ mil (divida por 1000), inclua apenas meses com dados.
- confianca: reduza se os dados estiverem incompletos, inconsistentes ou ilegíveis.
- Mínimo 3 recomendações, máximo 6.
- Responda APENAS com o JSON.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const result: AnalysisResult = JSON.parse(text);
  return result;
}

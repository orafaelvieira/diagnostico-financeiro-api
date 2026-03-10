import * as XLSX from "xlsx";

export interface ExtractedRow {
  conta: string;
  valores: Record<string, number>; // { "Jan/2025": 1000000, "Fev/2025": 950000, ... }
}

export interface ParsedDocument {
  tipo: string;
  linhas: ExtractedRow[];
  periodos: string[]; // colunas de período detectadas
  raw: string;        // representação textual para o Claude
}

function cleanValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  const str = String(val)
    .replace(/\./g, "")   // remove separador de milhar BR
    .replace(",", ".")    // converte decimal BR
    .replace(/[^0-9.\-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function parseExcel(buffer: Buffer, tipo: string): ParsedDocument {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  // Detecta a linha de cabeçalho (que contém os períodos/meses)
  let headerRowIdx = 0;
  let periodos: string[] = [];
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] as unknown[];
    const candidates = row.slice(1).filter(
      (v) => v && /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|20\d\d|q[1-4]/i.test(String(v))
    );
    if (candidates.length >= 2) {
      headerRowIdx = i;
      periodos = row.slice(1).map((v) => (v ? String(v) : "")).filter(Boolean);
      break;
    }
  }

  const linhas: ExtractedRow[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const conta = String(row[0] ?? "").trim();
    if (!conta || conta.length < 2) continue;

    const valores: Record<string, number> = {};
    row.slice(1).forEach((val, idx) => {
      const periodo = periodos[idx];
      const num = cleanValue(val);
      if (periodo && num !== null) valores[periodo] = num;
    });

    if (Object.keys(valores).length > 0) {
      linhas.push({ conta, valores });
    }
  }

  // Gera representação textual para o Claude
  const header = ["Conta", ...periodos].join(" | ");
  const separator = "---";
  const dataRows = linhas.map((l) => {
    const vals = periodos.map((p) => {
      const v = l.valores[p];
      return v !== undefined ? v.toLocaleString("pt-BR") : "-";
    });
    return [l.conta, ...vals].join(" | ");
  });
  const raw = [tipo, header, separator, ...dataRows].join("\n");

  return { tipo, linhas, periodos, raw };
}

export async function parsePDF(buffer: Buffer, tipo: string): Promise<ParsedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  const text = data.text as string;

  // Tenta extrair período do cabeçalho (ex: "Encerrado em: 31/12/2023")
  const periodoMatch = text.match(/[Ee]ncerrad[oa]\s+em[:\s]+(\d{2}\/\d{2}\/\d{4})/);
  const periodo = periodoMatch ? periodoMatch[1] : detectPeriodFromText(text);

  // Tenta extrair linhas estruturadas do texto do PDF
  const linhas = extractStructuredLines(text);

  const periodos = periodo ? [periodo] : [];

  // Atribui o período detectado como chave dos valores
  if (periodo && linhas.length > 0) {
    for (const l of linhas) {
      const keys = Object.keys(l.valores);
      if (keys.length === 1 && keys[0] === "_val") {
        l.valores[periodo] = l.valores["_val"];
        delete l.valores["_val"];
      }
    }
  }

  // Gera raw text — sempre inclui o texto original para o Claude
  const raw = `${tipo}\n${text.slice(0, 8000)}`;

  return { tipo, linhas, periodos, raw };
}

/**
 * Detecta período do texto quando não encontra "Encerrado em"
 */
function detectPeriodFromText(text: string): string {
  // Tenta "Data: DD/MM/YYYY"
  const dataMatch = text.match(/Data[:\s]+(\d{2}\/\d{2}\/\d{4})/);
  if (dataMatch) return dataMatch[1];
  // Tenta ano isolado tipo "2023" ou "2024"
  const anoMatch = text.match(/20[2-3]\d/);
  if (anoMatch) return anoMatch[0];
  return "";
}

/**
 * Extrai linhas estruturadas de um PDF financeiro brasileiro.
 * Formato esperado: CONTA_NAME    VALOR (ex: "ATIVO CIRCULANTE    488.441,31")
 * Retorna ExtractedRow[] com chave temporária "_val" para o valor.
 */
function extractStructuredLines(text: string): ExtractedRow[] {
  const lines = text.split("\n");
  const result: ExtractedRow[] = [];

  // Regex para valor brasileiro no final da linha: -?123.456,78
  const valorRegex = /(-?[\d.]+,\d{2})\s*$/;

  // Linhas a ignorar (cabeçalhos, rodapés, totais de conferência)
  const skipPatterns = /^(FOLHA|Data|Hora|Consolidação|Grau|Reconhecemos|CPF|CRC|ADMINISTRADOR|TÉCNICO|ANTONIO|JOSE CARLOS)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (skipPatterns.test(trimmed)) continue;

    const match = trimmed.match(valorRegex);
    if (!match) continue;

    // Extrai o nome da conta (tudo antes do valor)
    const valorStr = match[1];
    const conta = trimmed.slice(0, trimmed.lastIndexOf(valorStr)).trim();

    if (!conta || conta.length < 2) continue;
    // Ignora linhas que parecem ser apenas "Contabilidade Balanço Patrimonial" etc
    if (/^Contabilidade\b/i.test(conta)) continue;

    // Converte valor BR para número
    const num = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
    if (isNaN(num)) continue;

    result.push({ conta, valores: { "_val": num } });
  }

  return result;
}

/**
 * Converte ExtractedRow[] + periodos de volta para o formato texto
 * pipe-delimited que o Claude espera. Usado quando dados foram
 * editados manualmente e precisam ser reprocessados.
 */
export function dadosExtraidosToRaw(
  tipo: string,
  linhas: ExtractedRow[],
  periodos: string[]
): string {
  if (linhas.length === 0) return `${tipo}\n(sem dados estruturados)`;
  const header = ["Conta", ...periodos].join(" | ");
  const separator = "---";
  const dataRows = linhas.map((l) => {
    const vals = periodos.map((p) => {
      const v = l.valores[p];
      return v !== undefined ? v.toLocaleString("pt-BR") : "-";
    });
    return [l.conta, ...vals].join(" | ");
  });
  return [tipo, header, separator, ...dataRows].join("\n");
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  tipo: string
): Promise<ParsedDocument> {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return parsePDF(buffer, tipo);
  return parseExcel(buffer, tipo);
}

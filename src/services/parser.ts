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

  // Para PDF, envia o texto bruto para o Claude — ele extrai os valores
  return {
    tipo,
    linhas: [],
    periodos: [],
    raw: `${tipo}\n${text.slice(0, 8000)}`, // Limita a 8k chars por documento
  };
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

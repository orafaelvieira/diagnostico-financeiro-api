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

  // Detect periods from text
  const periodos = detectPeriodsFromPDF(text);

  // Try structured extraction first (multi-column PDF with separated names/values)
  let linhas = extractMultiColumnPDF(text, periodos);

  // If multi-column extraction didn't work well, fall back to single-line extraction
  if (linhas.length === 0) {
    linhas = extractInlinePDF(text, periodos);
  }

  // Fall back to legacy single-value extraction
  if (linhas.length === 0) {
    linhas = extractStructuredLines(text);
    // Assign period
    const periodo = periodos[0] || "";
    if (periodo && linhas.length > 0) {
      for (const l of linhas) {
        const keys = Object.keys(l.valores);
        if (keys.length === 1 && keys[0] === "_val") {
          l.valores[periodo] = l.valores["_val"];
          delete l.valores["_val"];
        }
      }
    }
  }

  // Gera raw text — sempre inclui o texto original para o Claude
  const raw = `${tipo}\n${text.slice(0, 8000)}`;

  return { tipo, linhas, periodos, raw };
}

/**
 * Detect financial periods from PDF text. Returns sorted period strings.
 * Prioritizes authoritative patterns ("Encerrado em", "Saldo período")
 * and excludes print/generation dates ("Data:", "Hora:").
 */
function detectPeriodsFromPDF(text: string): string[] {
  const periods = new Set<string>();

  // 1. Priority: "Encerrado em DD/MM/YYYY" — authoritative period marker
  const encerradoMatches = text.matchAll(/[Ee]ncerrad[oa]\s+em[:\s]+(\d{2}\/\d{2}\/\d{4})/g);
  for (const m of encerradoMatches) {
    periods.add(m[1]);
  }

  // 2. "Saldo período DD/MM/YYYY" — column header pattern
  const saldoMatches = text.matchAll(/[Ss]aldo\s+per[ií]odo\s*[\n\s]*(\d{2}\/\d{2}\/\d{4})/g);
  for (const m of saldoMatches) {
    periods.add(m[1]);
  }

  if (periods.size >= 1) {
    return sortPeriods(periods);
  }

  // 3. Collect all DD/MM/YYYY dates, but exclude print/generation dates
  const allDates = text.matchAll(/(\d{2}\/\d{2}\/(20\d{2}))/g);
  const candidates: string[] = [];
  for (const m of allDates) {
    candidates.push(m[1]);
  }

  // Filter out dates preceded by "Data:", "Gerado", "Impresso", "Hora"
  const printDatePattern = /(?:Data|Gerado|Impresso|Hora)[:\s]*\d{2}\/\d{2}\/\d{4}/gi;
  const printDates = new Set<string>();
  const printMatches = text.matchAll(printDatePattern);
  for (const m of printMatches) {
    const dateInMatch = m[0].match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateInMatch) printDates.add(dateInMatch[1]);
  }

  for (const d of candidates) {
    if (!printDates.has(d)) {
      periods.add(d);
    }
  }

  // If still multiple dates, prefer fiscal year-end dates (DD/12/YYYY)
  if (periods.size > 1) {
    const yearEnd = new Set<string>();
    for (const p of periods) {
      if (p.startsWith("31/12/") || p.startsWith("30/12/")) {
        yearEnd.add(p);
      }
    }
    if (yearEnd.size >= 1) {
      return sortPeriods(yearEnd);
    }
  }

  if (periods.size >= 1) {
    return sortPeriods(periods);
  }

  // 4. Fallback: standalone years
  const yearMatches = text.matchAll(/\b(20[2-3]\d)\b/g);
  const years = new Set<string>();
  for (const m of yearMatches) years.add(m[1]);
  if (years.size >= 1) {
    return Array.from(years).sort();
  }

  return [];
}

function sortPeriods(periods: Set<string>): string[] {
  return Array.from(periods).sort((a, b) => {
    const ya = parseInt(a.slice(-4));
    const yb = parseInt(b.slice(-4));
    if (ya !== yb) return ya - yb;
    return a.localeCompare(b);
  });
}

/**
 * Parse Brazilian number format: "1.234.567,89" or "(1.234.567,89)" for negative
 */
function parseBRNumber(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  // Check for negative in parentheses: (1.234,56)
  const isNeg = trimmed.startsWith("(") && trimmed.endsWith(")");
  const clean = trimmed
    .replace(/[()]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return isNeg ? -num : num;
}

/**
 * Extract data from multi-column PDFs where account names and values
 * are in separate blocks (common in Brazilian accounting software PDFs).
 *
 * These PDFs have structure like:
 * Page 1: Values block (just numbers), then Names block (code + name)
 * Header somewhere with "Saldo período 31/12/2023" etc.
 */
function extractMultiColumnPDF(text: string, periodos: string[]): ExtractedRow[] {
  const lines = text.split("\n");
  if (periodos.length < 1) return [];

  // Detect if this is a multi-column PDF by looking for the pattern:
  // Lines with ONLY numbers (value pairs) followed by lines with account codes
  const accountCodeRegex = /^\s*\d+\s+[\d.]+\s+(.+)$/; // e.g., "1067 1.02.03 IMOBILIZADO"
  const valueLineRegex = /^[\s(]*-?[\d.]+,\d{2}/; // starts with a BR number

  const valueLines: string[] = [];
  const nameLines: Array<{ code: string; name: string; indent: number }> = [];
  let hasCodeLines = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if it's an account code line (e.g., "1067 1.02.03 IMOBILIZADO")
    const codeMatch = trimmed.match(/^\s*(\d+)\s+([\d.]+)\s+(.+)$/);
    if (codeMatch) {
      hasCodeLines = true;
      const indent = line.length - line.trimStart().length;
      nameLines.push({
        code: codeMatch[2],
        name: codeMatch[3].trim(),
        indent,
      });
    }
  }

  if (!hasCodeLines || nameLines.length < 5) return [];

  // This IS a multi-column PDF. Now we need to collect value blocks and correlate.
  // The approach: find value-only lines between headers and name blocks,
  // then reverse-map to names based on the hierarchical order.

  // The names come in REVERSE order in the PDF (bottom-to-top within each page).
  // We need to reverse them to get top-to-bottom order.
  // But they're also grouped by page, so we need to handle page breaks.

  // Simpler approach: Parse account hierarchy from code numbers and build the structure.
  // The code numbers tell us the hierarchy (1.01 > 1.01.01 > 1.01.01.01).
  // Sort by code number to get the correct order.
  nameLines.sort((a, b) => {
    const aParts = a.code.split(".").map(Number);
    const bParts = b.code.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const av = aParts[i] ?? 0;
      const bv = bParts[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  });

  // Now collect all value-pair lines (lines with 2+ BR numbers and no letters)
  // These are blocks of pure numbers between page headers
  type ValuePair = number[];
  const allValueBlocks: ValuePair[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip non-value lines
    if (/[a-zA-ZÀ-ú]/.test(trimmed)) continue;

    // Extract all BR numbers from this line
    const numbers: number[] = [];
    // Match: optional negative sign or parens, digits with dots, comma, 2 decimal digits
    const numMatches = trimmed.matchAll(/(\(?\-?[\d.]+,\d{2}\)?)/g);
    for (const m of numMatches) {
      const n = parseBRNumber(m[1]);
      if (n !== null) numbers.push(n);
    }

    if (numbers.length >= 1) {
      allValueBlocks.push(numbers);
    }
  }

  // Now we need to correlate value blocks with name lines.
  // In multi-column PDFs, the number of value lines per page should match
  // the number of name lines. But names may span multiple pages.
  // The simplest heuristic: if nameLines.length == allValueBlocks.length, direct mapping.

  if (nameLines.length === 0 || allValueBlocks.length === 0) return [];

  // If counts match (or close), map 1:1
  const result: ExtractedRow[] = [];

  if (Math.abs(nameLines.length - allValueBlocks.length) <= 3) {
    // Direct 1:1 mapping
    const count = Math.min(nameLines.length, allValueBlocks.length);
    for (let i = 0; i < count; i++) {
      const name = nameLines[i];
      const vals = allValueBlocks[i];
      const valores: Record<string, number> = {};

      // Map values to periods
      for (let j = 0; j < Math.min(vals.length, periodos.length); j++) {
        valores[periodos[j]] = vals[j];
      }

      if (Object.keys(valores).length > 0) {
        result.push({ conta: name.name, valores });
      }
    }
  } else {
    // Counts don't match — this is common when value blocks include subtotals
    // that don't have corresponding name lines, or vice versa.
    // Fall back to inline extraction.
    return [];
  }

  return result;
}

/**
 * Extract data from PDFs where account name and values are on the same line,
 * but concatenated without spaces.
 * Example: "RECEITA BRUTA DE VENDAS E SERVIÇOS105.491.499,80109.689.157,06"
 */
function extractInlinePDF(text: string, periodos: string[]): ExtractedRow[] {
  const lines = text.split("\n");
  const result: ExtractedRow[] = [];

  // Skip patterns
  const skipPatterns = /^(FOLHA|Data|Hora|Consolidação|Grau|Reconhecemos|CPF|CRC|ADMINISTRADOR|TÉCNICO|ANTONIO|JOSE CARLOS|ROBERTO|MARCO|Diretor|Contador|INSCR|LACTOBOM|DEMONSTRATIVO|BALANCO|Conta\d|ContaSaldo)/i;

  // BR number pattern: optional parens/negative, digits with dots, comma, 2 decimals
  const brNumPattern = /\(?-?[\d.]+,\d{2}\)?/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (skipPatterns.test(trimmed)) continue;

    // Find all BR numbers in the line
    const numMatches = [...trimmed.matchAll(brNumPattern)];
    if (numMatches.length === 0) continue;

    // Extract account name: everything before the first number
    const firstNumIdx = numMatches[0].index!;
    let conta = trimmed.slice(0, firstNumIdx).trim();

    // Skip lines that are just numbers (no account name)
    if (!conta || conta.length < 2) continue;
    // Skip lines where "conta" is itself a number-like string
    if (/^[\d.,\-()]+$/.test(conta)) continue;
    // Skip header/footer lines
    if (/^(CNPJ|Toledo|72\.\d)/i.test(conta)) continue;

    // Parse all numbers from the line
    const values: number[] = [];
    for (const m of numMatches) {
      const n = parseBRNumber(m[0]);
      if (n !== null) values.push(n);
    }

    if (values.length === 0) continue;

    // Map values to periods
    const valores: Record<string, number> = {};
    if (values.length >= 2 && periodos.length >= 2) {
      // Multi-period: map each value to its period
      for (let i = 0; i < Math.min(values.length, periodos.length); i++) {
        valores[periodos[i]] = values[i];
      }
    } else if (values.length === 1 && periodos.length >= 1) {
      // Single value: assign to first period
      valores[periodos[0]] = values[0];
    } else if (values.length === 1) {
      // No detected period, use placeholder
      valores["_val"] = values[0];
    } else if (values.length >= 2 && periodos.length === 1) {
      // Multiple values but only one period known — use first value
      valores[periodos[0]] = values[0];
    } else {
      // Multiple values but no period info — use index
      values.forEach((v, i) => {
        valores[`P${i + 1}`] = v;
      });
    }

    result.push({ conta, valores });
  }

  return result;
}

/**
 * Legacy: Extrai linhas estruturadas de um PDF financeiro brasileiro.
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
    // Ignora linhas que parecem ser apenas números
    if (/^[\d.,\-()]+$/.test(conta)) continue;
    // Ignora linhas que parecem ser "Contabilidade Balanço Patrimonial" etc
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

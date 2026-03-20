import type { ExtractedRow } from "./parser";
import type { BPLineItem, DRELineItem } from "../types/financial";
import { BP_TEMPLATE, DRE_TEMPLATE, ACCOUNT_ALIASES } from "./financial-templates";

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, " ")  // replace non-alphanumeric with space
    .replace(/\s+/g, " ")         // collapse whitespace
    .trim();
}

/** Remove common prefixes like (-), (–) and leading whitespace */
function cleanAccountName(name: string): string {
  return name
    .replace(/^\s*\(?[\-–]\)?\s*/, "")  // remove leading (-) or (-)
    .replace(/^\s*[\-–]\s*/, "")         // remove leading dash
    .trim();
}

function findBestMatch(conta: string, candidates: string[]): string | null {
  const cleaned = cleanAccountName(conta);
  const norm = normalize(cleaned);

  if (!norm || norm.length < 2) return null;

  // 1. Exact match (case-insensitive, accent-insensitive)
  for (const c of candidates) {
    if (normalize(c) === norm) return c;
  }

  // 2. Alias match — try both original and cleaned name
  for (const name of [conta, cleaned, conta.trim()]) {
    const aliased = ACCOUNT_ALIASES[name];
    if (aliased && candidates.includes(aliased)) return aliased;
  }

  // Alias with normalized lookup
  for (const [alias, canonical] of Object.entries(ACCOUNT_ALIASES)) {
    if (normalize(alias) === norm && candidates.includes(canonical)) return canonical;
  }

  // 3. Contains match — extracted conta contains the template name or vice versa
  for (const c of candidates) {
    const normC = normalize(c);
    if (normC.length >= 4 && norm.length >= 4) {
      if (norm.includes(normC) || normC.includes(norm)) return c;
    }
  }

  // 4. Keyword match — check if key words overlap significantly
  const normWords = norm.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestCandidate: string | null = null;
  for (const c of candidates) {
    const cWords = normalize(c).split(/\s+/).filter(w => w.length > 2);
    if (cWords.length === 0) continue;
    const overlap = normWords.filter(w => cWords.includes(w)).length;
    const score = overlap / Math.max(cWords.length, 1);
    // Also compute reverse score (how much of the extracted name matches)
    const reverseScore = overlap / Math.max(normWords.length, 1);
    const combinedScore = (score + reverseScore) / 2;

    if (combinedScore > bestScore && overlap >= 1) {
      // Require higher threshold for single-word overlap
      if (overlap === 1 && score < 0.8) continue;
      bestScore = combinedScore;
      bestCandidate = c;
    }
  }

  if (bestScore >= 0.4 && bestCandidate) return bestCandidate;

  return null;
}

export function mapExtractedToBP(linhas: ExtractedRow[]): BPLineItem[] {
  const templateNames = BP_TEMPLATE.map(t => t.conta);
  const result: BPLineItem[] = BP_TEMPLATE.map(t => ({
    classificacao: t.classificacao,
    conta: t.conta,
    valores: {},
    nivel: t.nivel,
    editado: false,
  }));

  const unmatched: BPLineItem[] = [];
  const matched = new Set<string>();

  for (const linha of linhas) {
    const match = findBestMatch(linha.conta, templateNames);
    if (match) {
      const idx = result.findIndex(r => r.conta === match);
      if (idx >= 0) {
        matched.add(match);
        // Merge values (don't overwrite existing non-zero values)
        for (const [periodo, valor] of Object.entries(linha.valores)) {
          if (result[idx].valores[periodo] === undefined || result[idx].valores[periodo] === 0) {
            result[idx].valores[periodo] = valor;
          }
        }
      }
    } else {
      // Unmatched — include for manual review
      unmatched.push({
        classificacao: "0",
        conta: linha.conta,
        valores: { ...linha.valores },
        nivel: 3,
        editado: false,
      });
    }
  }

  // Append unmatched at the end
  return [...result, ...unmatched];
}

// DRE totalizer names that should NOT be mapped via fuzzy matching.
// These are parent-level totals whose sub-items are individually mapped.
// They would otherwise fuzzy-match to specific sub-categories and pollute them.
const DRE_SKIP_TOTALS = new Set([
  "despesas operacionais",  // total of all operating expenses — sub-items mapped individually
]);

export function mapExtractedToDRE(linhas: ExtractedRow[]): DRELineItem[] {
  const templateNames = DRE_TEMPLATE.map(t => t.conta);
  const result: DRELineItem[] = DRE_TEMPLATE.map(t => ({
    conta: t.conta,
    valores: {},
    subtotal: t.subtotal,
    editado: false,
  }));

  const unmatched: DRELineItem[] = [];

  for (const linha of linhas) {
    // Skip known totalizer lines that would pollute sub-item mapping via fuzzy match
    const normConta = linha.conta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (DRE_SKIP_TOTALS.has(normConta)) {
      unmatched.push({ conta: linha.conta, valores: { ...linha.valores }, subtotal: false, editado: false });
      continue;
    }
    const match = findBestMatch(linha.conta, templateNames);
    if (match) {
      const idx = result.findIndex(r => r.conta === match);
      if (idx >= 0) {
        for (const [periodo, valor] of Object.entries(linha.valores)) {
          if (result[idx].valores[periodo] === undefined || result[idx].valores[periodo] === 0) {
            result[idx].valores[periodo] = valor;
          }
        }
      }
    } else {
      unmatched.push({
        conta: linha.conta,
        valores: { ...linha.valores },
        subtotal: false,
        editado: false,
      });
    }
  }

  return [...result, ...unmatched];
}

/** Detect all unique periods across extracted documents */
export function detectPeriodos(parsedDocs: Array<{ periodos: string[] }>): string[] {
  const set = new Set<string>();
  for (const doc of parsedDocs) {
    for (const p of doc.periodos) set.add(p);
  }
  // Sort: try numeric (years) first, then alphabetical
  return Array.from(set).sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    // Sort dates by year
    const ya = a.match(/20\d{2}/)?.[0];
    const yb = b.match(/20\d{2}/)?.[0];
    if (ya && yb) return parseInt(ya) - parseInt(yb);
    return a.localeCompare(b);
  });
}

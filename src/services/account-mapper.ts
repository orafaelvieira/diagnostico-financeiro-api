import type { ExtractedRow } from "./parser";
import type { BPLineItem, DRELineItem } from "../types/financial";
import { BP_TEMPLATE, DRE_TEMPLATE, ACCOUNT_ALIASES } from "./financial-templates";

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function findBestMatch(conta: string, candidates: string[]): string | null {
  const norm = normalize(conta);

  // 1. Exact match (case-insensitive, accent-insensitive)
  for (const c of candidates) {
    if (normalize(c) === norm) return c;
  }

  // 2. Alias match
  const aliased = ACCOUNT_ALIASES[conta] || ACCOUNT_ALIASES[conta.trim()];
  if (aliased && candidates.includes(aliased)) return aliased;

  // Alias with normalized lookup
  for (const [alias, canonical] of Object.entries(ACCOUNT_ALIASES)) {
    if (normalize(alias) === norm && candidates.includes(canonical)) return canonical;
  }

  // 3. Contains match — extracted conta contains the template name or vice versa
  for (const c of candidates) {
    const normC = normalize(c);
    if (normC.length >= 5 && (norm.includes(normC) || normC.includes(norm))) return c;
  }

  // 4. Keyword match — check if key words overlap significantly
  const normWords = norm.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestCandidate: string | null = null;
  for (const c of candidates) {
    const cWords = normalize(c).split(/\s+/).filter(w => w.length > 2);
    const overlap = normWords.filter(w => cWords.includes(w)).length;
    const score = overlap / Math.max(cWords.length, 1);
    if (score > bestScore && score >= 0.6 && overlap >= 2) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  return bestCandidate;
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

  for (const linha of linhas) {
    const match = findBestMatch(linha.conta, templateNames);
    if (match) {
      const idx = result.findIndex(r => r.conta === match);
      if (idx >= 0) {
        // Merge values (don't overwrite existing non-zero values)
        for (const [periodo, valor] of Object.entries(linha.valores)) {
          if (result[idx].valores[periodo] === undefined || result[idx].valores[periodo] === 0) {
            result[idx].valores[periodo] = valor;
          }
        }
      }
    } else {
      // Unmatched — try to determine classification from context
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
    return a.localeCompare(b);
  });
}

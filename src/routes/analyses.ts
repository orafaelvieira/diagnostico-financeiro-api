import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { downloadFile } from "../services/storage";
import { parseDocument, dadosExtraidosToRaw, type ExtractedRow, type ParsedDocument } from "../services/parser";
import { generateAnalysis } from "../services/claude";
import { mapExtractedToBP, mapExtractedToDRE, detectPeriodos } from "../services/account-mapper";
import { calculateIndicators } from "../services/indicator-calculator";
import type { DadosEstruturados, BPLineItem, DRELineItem } from "../types/financial";

const router = Router();
router.use(requireAuth);

const analysisSchema = z.object({
  companyId: z.string().uuid(),
  nome: z.string().min(2),
  periodo: z.string().optional(),
  tipo: z.enum(["Completa", "Rápida"]).default("Completa"),
});

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const companyId = req.query.companyId as string | undefined;
  const analyses = await prisma.analysis.findMany({
    where: {
      userId: req.userId!,
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { company: { select: { razaoSocial: true, nomeFantasia: true } } },
  });
  res.json(analyses);
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = analysisSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const company = await prisma.company.findFirst({
    where: { id: parsed.data.companyId, userId: req.userId! },
  });
  if (!company) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

  const analysis = await prisma.analysis.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  res.status(201).json(analysis);
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    include: {
      company: true,
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }
  res.json(analysis);
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const existing = await prisma.analysis.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Análise não encontrada" }); return; }
  await prisma.analysis.delete({ where: { id } });
  res.status(204).send();
});

// Endpoint principal: dispara extração dos documentos + geração da análise com Claude
router.post("/:id/process", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    include: { company: true, documents: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }
  if (analysis.documents.length === 0) {
    res.status(400).json({ error: "Nenhum documento enviado para esta análise" });
    return;
  }

  try {
    // 1. Atualiza status para "Extraindo"
    await prisma.analysis.update({ where: { id: analysis.id }, data: { status: "Extraindo" } });

    // 2. Baixa e parseia cada documento (ou usa dados editados manualmente)
    const parsedDocs: ParsedDocument[] = await Promise.all(
      analysis.documents.map(async (doc) => {
        try {
          // Se o documento foi editado manualmente, usar os dados editados
          if (doc.editadoManualmente && doc.dadosExtraidos) {
            const dados = doc.dadosExtraidos as any;
            const linhas: ExtractedRow[] = dados.linhas || (Array.isArray(dados) ? dados : []);
            const periodos: string[] = dados.periodos ||
              (linhas.length > 0 ? Object.keys(linhas[0].valores) : []);
            const raw = dadosExtraidosToRaw(doc.tipo, linhas, periodos);
            return { tipo: doc.tipo, linhas, periodos, raw };
          }

          // Caso contrário, re-parsear o arquivo original
          const buffer = await downloadFile(doc.storagePath!);
          const parsed = await parseDocument(buffer, doc.nome, doc.tipo);

          await prisma.document.update({
            where: { id: doc.id },
            data: {
              dadosExtraidos: { linhas: parsed.linhas, periodos: parsed.periodos } as any,
              status: "Processado",
              confianca: 85,
            },
          });
          return parsed;
        } catch (err) {
          await prisma.document.update({ where: { id: doc.id }, data: { status: "Erro" } });
          throw err;
        }
      })
    );

    // 2.5 Compute structured financial data (BP, DRE, Indicadores)
    const allPeriodos = detectPeriodos(parsedDocs);
    let structuredBP: BPLineItem[] = [];
    let structuredDRE: DRELineItem[] = [];

    // Auto-detect document type — content-first, tipo as fallback
    function detectDocType(doc: ParsedDocument): "BP" | "DRE" | "BOTH" | "UNKNOWN" {
      // 1. ALWAYS check content first (more reliable than user-provided tipo)
      const raw = doc.raw.toLowerCase();
      const hasBP = raw.includes("ativo circulante") || raw.includes("passivo circulante") || raw.includes("a t i v o");
      // DRE keywords — must be specific enough to NOT match BP account names
      // Avoid: "prejuizo" (matches BP "LUCROS OU PREJUIZOS ACUMULADOS")
      // Avoid: "resultado do exerc" (matches BP PL section "RESULTADO DO EXERCÍCIO")
      // Avoid: "despesas operacionais", "lucro bruto" (too generic, appear in some BPs)
      const hasDRE = raw.includes("receita bruta") || raw.includes("resultado liquido") ||
                     raw.includes("custo operacional") || raw.includes("custo produtos vendidos") ||
                     raw.includes("demonstrativo de resultado") || raw.includes("demonstração do resultado") ||
                     raw.includes("receita de vendas") || raw.includes("deducoes da receita") ||
                     raw.includes("deduções da receita") || raw.includes("despesas com vendas") ||
                     raw.includes("receita operacional líquida") || raw.includes("custo das mercadorias");

      if (hasBP && hasDRE) return "BOTH";
      if (hasBP) return "BP";
      if (hasDRE) return "DRE";

      // 2. Fallback: user-provided tipo field
      const tipoNorm = doc.tipo.toLowerCase();
      if (tipoNorm.includes("balan") || tipoNorm.includes("balancete")) return "BP";
      if (tipoNorm.includes("dre") || tipoNorm.includes("resultado") || tipoNorm.includes("demonstra")) return "DRE";

      return "UNKNOWN";
    }

    for (const doc of parsedDocs) {
      const docType = detectDocType(doc);
      console.log(`[process] Doc "${doc.tipo}" detected as ${docType}, linhas: ${doc.linhas.length}, raw length: ${doc.raw.length}`);

      if ((docType === "BP" || docType === "BOTH") && structuredBP.length === 0) {
        structuredBP = mapExtractedToBP(doc.linhas);
      }
      if ((docType === "DRE" || docType === "BOTH") && structuredDRE.length === 0) {
        structuredDRE = mapExtractedToDRE(doc.linhas);
      }

      // Fallback: if docType is UNKNOWN but user said it's DRE/BP, try anyway
      if (docType === "UNKNOWN" && doc.linhas.length > 0) {
        const tipoNorm = doc.tipo.toLowerCase();
        if ((tipoNorm.includes("dre") || tipoNorm.includes("resultado")) && structuredDRE.length === 0) {
          console.log(`[process] Fallback: treating UNKNOWN doc as DRE based on tipo="${doc.tipo}"`);
          structuredDRE = mapExtractedToDRE(doc.linhas);
        } else if ((tipoNorm.includes("balan") || tipoNorm.includes("balancete")) && structuredBP.length === 0) {
          console.log(`[process] Fallback: treating UNKNOWN doc as BP based on tipo="${doc.tipo}"`);
          structuredBP = mapExtractedToBP(doc.linhas);
        }
      }
    }

    const indicadores = calculateIndicators(structuredBP, structuredDRE, allPeriodos);

    const dadosEstruturados: DadosEstruturados = {
      bp: structuredBP,
      dre: structuredDRE,
      indicadores,
      periodos: allPeriodos,
      version: 1,
    };

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        dadosEstruturados: dadosEstruturados as any,
        periodo: allPeriodos.join(" a "),
      },
    });

    // 3. Atualiza status para "Gerando diagnóstico"
    await prisma.analysis.update({ where: { id: analysis.id }, data: { status: "Gerando diagnóstico" } });

    // 4. Chama Claude para gerar a análise
    const resultado = await generateAnalysis(
      parsedDocs,
      {
        razaoSocial: analysis.company.razaoSocial,
        setor: analysis.company.setor ?? "Não informado",
        porte: analysis.company.porte ?? "Não informado",
      },
      analysis.periodo ?? "Período não informado"
    );

    // 5. Salva resultado e marca como concluída
    const updated = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "Concluída",
        resultado: resultado as object,
        confianca: resultado.confianca,
      },
    });

    res.json(updated);
  } catch (err) {
    await prisma.analysis.update({ where: { id: analysis.id }, data: { status: "Erro" } });
    console.error("Erro ao processar análise:", err);
    res.status(500).json({ error: "Erro ao processar análise", detail: String(err) });
  }
});

// === Structured Financial Data Endpoints ===

router.get("/:id/dados-estruturados", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    select: { dadosEstruturados: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }
  if (!analysis.dadosEstruturados) { res.json({ bp: [], dre: [], indicadores: [], periodos: [], version: 1 }); return; }
  res.json(analysis.dadosEstruturados);
});

router.put("/:id/dados-estruturados/bp", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    select: { dadosEstruturados: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }

  const dados = (analysis.dadosEstruturados as any) || { bp: [], dre: [], indicadores: [], periodos: [], version: 1 };
  dados.bp = req.body.linhas;

  await prisma.analysis.update({
    where: { id },
    data: { dadosEstruturados: dados },
  });
  res.json({ ok: true });
});

router.put("/:id/dados-estruturados/dre", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    select: { dadosEstruturados: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }

  const dados = (analysis.dadosEstruturados as any) || { bp: [], dre: [], indicadores: [], periodos: [], version: 1 };
  dados.dre = req.body.linhas;

  await prisma.analysis.update({
    where: { id },
    data: { dadosEstruturados: dados },
  });
  res.json({ ok: true });
});

router.put("/:id/dados-estruturados/indicadores/override", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    select: { dadosEstruturados: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }

  const { nome, periodo, valor } = req.body;
  const dados = (analysis.dadosEstruturados as any) || { bp: [], dre: [], indicadores: [], periodos: [], version: 1 };

  const indicador = dados.indicadores?.find((i: any) => i.nome === nome);
  if (indicador) {
    if (!indicador.overrides) indicador.overrides = {};
    indicador.overrides[periodo] = valor;
  }

  await prisma.analysis.update({
    where: { id },
    data: { dadosEstruturados: dados },
  });
  res.json({ ok: true });
});

router.post("/:id/recalcular-indicadores", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId: req.userId! },
    select: { dadosEstruturados: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }
  if (!analysis.dadosEstruturados) { res.status(400).json({ error: "Sem dados estruturados" }); return; }

  const dados = analysis.dadosEstruturados as any as DadosEstruturados;
  const newIndicadores = calculateIndicators(dados.bp, dados.dre, dados.periodos);

  // Preserve user overrides from old indicators
  for (const newInd of newIndicadores) {
    const oldInd = dados.indicadores?.find((i: any) => i.nome === newInd.nome);
    if (oldInd?.overrides) {
      newInd.overrides = oldInd.overrides;
    }
  }

  dados.indicadores = newIndicadores;

  await prisma.analysis.update({
    where: { id },
    data: { dadosEstruturados: dados as any },
  });
  res.json(dados);
});

export default router;

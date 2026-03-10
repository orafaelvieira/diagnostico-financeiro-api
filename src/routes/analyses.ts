import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { downloadFile } from "../services/storage";
import { parseDocument, dadosExtraidosToRaw, type ExtractedRow, type ParsedDocument } from "../services/parser";
import { generateAnalysis } from "../services/claude";

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

export default router;

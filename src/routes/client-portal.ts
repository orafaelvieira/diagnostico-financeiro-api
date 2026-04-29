import { Router, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { uploadFile } from "../services/storage";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * Carrega a análise que pertence ao cliente logado. Para clientes,
 * a relação é via Company.userId == client.id (o cliente é dono da
 * "company" que representa a empresa-alvo no portal).
 */
async function loadClientAnalysis(userId: string) {
  const company = await prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!company) return null;
  return prisma.analysis.findFirst({
    where: { companyId: company.id, kind: "ibr" },
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      documents: true,
      engagement: { include: { rt: { select: { name: true, email: true } } } },
    },
  });
}

function phaseFromState(reviewState: string, status: string, hasDocuments: boolean) {
  if (reviewState === "delivered") return "delivered";
  if (reviewState === "signed") return "delivery";
  if (reviewState === "approved") return "review";
  if (reviewState === "in_review" || reviewState === "revision_requested") return "review";
  if (status === "Concluída") return "analysis";
  if (hasDocuments) return "analysis";
  return "collection";
}

router.get("/status", async (req: AuthRequest, res: Response): Promise<void> => {
  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.status(404).json({ error: "Sem IBR ativo" }); return; }

  const checklist = (analysis.documentChecklist as { id: string; status: string }[] | null) ?? [];
  const pendingDocs = checklist.filter((c) => c.status === "requested" || c.status === "pending").length;
  const questionnaire = (analysis.questionnaire as { questions?: unknown[]; answers?: Record<string, unknown> } | null) ?? null;
  const totalQuestions = questionnaire?.questions?.length ?? 0;
  const answered = questionnaire?.answers ? Object.keys(questionnaire.answers).length : 0;

  res.json({
    analysisId: analysis.id,
    companyName: analysis.company?.razaoSocial ?? "Empresa",
    phase: phaseFromState(analysis.reviewState, analysis.status, analysis.documents.length > 0),
    expectedDeliveryDate: analysis.engagement?.deadline?.toISOString(),
    rtName: analysis.engagement?.rt?.name,
    rtEmail: analysis.engagement?.rt?.email,
    pendingDocsCount: pendingDocs,
    pendingQuestionnaireCount: Math.max(0, totalQuestions - answered),
    reportReady: analysis.reviewState === "signed" || analysis.reviewState === "delivered",
  });
});

router.get("/docs", async (req: AuthRequest, res: Response): Promise<void> => {
  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.json([]); return; }
  const checklist = (analysis.documentChecklist as Array<{
    id: string; label: string; status: string; required?: boolean;
    uploadedAt?: string; fileName?: string; rejectionReason?: string;
  }> | null) ?? [];
  res.json(checklist);
});

router.post("/docs/upload", upload.single("file"), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "Arquivo ausente" }); return; }
  const docRequestId = req.body?.docRequestId as string | undefined;
  if (!docRequestId) { res.status(400).json({ error: "docRequestId obrigatório" }); return; }

  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.status(404).json({ error: "Sem IBR ativo" }); return; }

  const key = `client-uploads/${analysis.id}/${docRequestId}/${Date.now()}-${req.file.originalname}`;
  const url = await uploadFile(req.file.buffer as Buffer, key, req.file.mimetype);

  // Hash para anexo auditável.
  const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

  // Cria Document linkado.
  await prisma.document.create({
    data: {
      analysisId: analysis.id,
      companyId: analysis.companyId,
      nome: req.file.originalname,
      tipo: "Outro",
      status: "Pendente",
      storagePath: url,
      hash,
      tamanho: `${(req.file.size / 1024).toFixed(0)} KB`,
    },
  });

  // Atualiza checklist.
  const checklist = ((analysis.documentChecklist as Array<Record<string, unknown>> | null) ?? []).slice();
  const idx = checklist.findIndex((c) => c.id === docRequestId);
  if (idx !== -1) {
    checklist[idx] = {
      ...checklist[idx],
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
      fileName: req.file.originalname,
      hash,
    };
  } else {
    checklist.push({
      id: docRequestId,
      label: req.file.originalname,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
      fileName: req.file.originalname,
      hash,
    });
  }
  await prisma.analysis.update({
    where: { id: analysis.id },
    data: { documentChecklist: checklist as object },
  });

  res.status(201).json({ ok: true, hash });
});

router.get("/questionnaire", async (req: AuthRequest, res: Response): Promise<void> => {
  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.json({ questions: [], answers: {} }); return; }
  const data = (analysis.questionnaire as { questions?: unknown[]; answers?: Record<string, unknown> } | null) ?? null;
  res.json({
    questions: data?.questions ?? [],
    answers: data?.answers ?? {},
  });
});

router.put("/questionnaire", async (req: AuthRequest, res: Response): Promise<void> => {
  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.status(404).json({ error: "Sem IBR ativo" }); return; }
  const answers = (req.body?.answers ?? {}) as Record<string, unknown>;
  const existing = (analysis.questionnaire as { questions?: unknown[]; answers?: Record<string, unknown> } | null) ?? {};
  const updated = await prisma.analysis.update({
    where: { id: analysis.id },
    data: {
      questionnaire: {
        questions: existing.questions ?? [],
        answers,
      } as object,
    },
  });
  res.json(updated.questionnaire);
});

router.get("/deliverable", async (req: AuthRequest, res: Response): Promise<void> => {
  const analysis = await loadClientAnalysis(req.userId!);
  if (!analysis) { res.json({ ready: false }); return; }

  const ready = analysis.reviewState === "signed" || analysis.reviewState === "delivered";
  if (!ready) { res.json({ ready: false, message: "IBR ainda em elaboração ou revisão." }); return; }

  const sig = analysis.signature as { partnerName?: string; professionalRegistration?: string; signedAt?: string } | null;
  res.json({
    ready: true,
    reportUrl: `/api/analyses/${analysis.id}/pdf`, // backend pode servir PDF no futuro
    signedAt: sig?.signedAt,
    partnerName: sig?.partnerName,
    professionalRegistration: sig?.professionalRegistration,
  });
});

export default router;

import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const engagementCreateSchema = z.object({
  companyName: z.string().min(2),
  requestedBy: z.string().min(2),
  requestedByType: z.enum(["lender", "investor", "advisor", "other"]).default("lender"),
  scope: z.string().default(""),
  state: z.enum(["lead", "proposal_sent", "won", "kicked_off", "completed", "lost"]).default("lead"),
  deadline: z.string().optional(),
  feeAmount: z.number().optional(),
  feeCurrency: z.string().default("BRL"),
  rtId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const engagementUpdateSchema = engagementCreateSchema.partial();

const VALID_TRANSITIONS: Record<string, string[]> = {
  lead: ["proposal_sent", "lost"],
  proposal_sent: ["won", "lost"],
  won: ["kicked_off", "lost"],
  kicked_off: ["completed"],
  completed: [],
  lost: [],
};

function withCompanyName(eng: Record<string, unknown> & { companyName?: string }) {
  return eng;
}

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const items = await prisma.engagement.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: { rt: { select: { id: true, name: true } } },
  });
  const out = items.map((e) => ({
    ...e,
    rtName: e.rt?.name ?? null,
    deadline: e.deadline?.toISOString(),
    signedAt: e.signedAt?.toISOString(),
  }));
  res.json(out);
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id || typeof id !== "string") { res.status(404).json({ error: "ID inválido" }); return; }
  const eng = await prisma.engagement.findFirst({
    where: { id, userId: req.userId! },
    include: { rt: { select: { id: true, name: true } } },
  });
  if (!eng) { res.status(404).json({ error: "Engagement não encontrado" }); return; }
  res.json({
    ...eng,
    rtName: eng.rt?.name ?? null,
    deadline: eng.deadline?.toISOString(),
    signedAt: eng.signedAt?.toISOString(),
  });
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = engagementCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const created = await prisma.engagement.create({
    data: {
      userId: req.userId!,
      companyName: parsed.data.companyName,
      requestedBy: parsed.data.requestedBy,
      requestedByType: parsed.data.requestedByType,
      scope: parsed.data.scope,
      state: parsed.data.state,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      feeAmount: parsed.data.feeAmount,
      feeCurrency: parsed.data.feeCurrency,
      rtId: parsed.data.rtId,
      notes: parsed.data.notes,
    },
    include: { rt: { select: { id: true, name: true } } },
  });
  res.status(201).json({
    ...created,
    rtName: created.rt?.name ?? null,
    deadline: created.deadline?.toISOString(),
    signedAt: created.signedAt?.toISOString(),
  });
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id || typeof id !== "string") { res.status(404).json({ error: "ID inválido" }); return; }
  const eng = await prisma.engagement.findFirst({ where: { id, userId: req.userId! } });
  if (!eng) { res.status(404).json({ error: "Engagement não encontrado" }); return; }
  const parsed = engagementUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const updated = await prisma.engagement.update({
    where: { id },
    data: {
      ...parsed.data,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
    },
  });
  res.json(updated);
});

router.post("/:id/transition", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id || typeof id !== "string") { res.status(404).json({ error: "ID inválido" }); return; }
  const eng = await prisma.engagement.findFirst({ where: { id, userId: req.userId! } });
  if (!eng) { res.status(404).json({ error: "Engagement não encontrado" }); return; }
  const toState = (req.body?.toState as string) || "";
  const allowed = VALID_TRANSITIONS[eng.state] ?? [];
  if (!allowed.includes(toState)) {
    res.status(409).json({ error: `Transição inválida ${eng.state} → ${toState}` });
    return;
  }

  // Se for 'won' e não houver IBR vinculado, cria automaticamente.
  let analysisId = eng.analysisId;
  if (toState === "won" && !analysisId) {
    // Tenta achar uma Company existente com mesmo nome.
    const existingCompany = await prisma.company.findFirst({
      where: { userId: req.userId!, razaoSocial: eng.companyName },
    });
    const company =
      existingCompany ??
      (await prisma.company.create({
        data: {
          userId: req.userId!,
          razaoSocial: eng.companyName,
          status: "ativo",
        },
      }));
    const created = await prisma.analysis.create({
      data: {
        companyId: company.id,
        userId: req.userId!,
        nome: `IBR — ${eng.companyName}`,
        kind: "ibr",
        status: "Rascunho",
      },
    });
    analysisId = created.id;
  }

  const updated = await prisma.engagement.update({
    where: { id },
    data: {
      state: toState,
      ...(analysisId !== eng.analysisId ? { analysisId } : {}),
    },
    include: { rt: { select: { name: true } } },
  });
  res.json({
    ...updated,
    rtName: updated.rt?.name ?? null,
    deadline: updated.deadline?.toISOString(),
    signedAt: updated.signedAt?.toISOString(),
  });
});

export default router;

import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const eventSchema = z.object({
  analysisId: z.string().uuid(),
  entity: z.enum(["bp", "dre", "indicador", "stcf", "scenario", "option", "engagement", "summary"]),
  entityId: z.string().optional(),
  field: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  source: z.enum(["manual", "extracted", "formula", "import"]).default("manual"),
  reason: z.string().optional(),
});

router.post("/events", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const analysis = await prisma.analysis.findFirst({
    where: { id: parsed.data.analysisId, userId: req.userId! },
    select: { id: true },
  });
  if (!analysis) { res.status(404).json({ error: "Análise não encontrada" }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const event = await prisma.auditEvent.create({
    data: {
      analysisId: analysis.id,
      userId: req.userId!,
      userName: user?.name ?? "Usuário",
      entity: parsed.data.entity,
      entityId: parsed.data.entityId,
      field: parsed.data.field,
      before: parsed.data.before as object,
      after: parsed.data.after as object,
      source: parsed.data.source,
      reason: parsed.data.reason,
    },
  });
  res.status(201).json(event);
});

export default router;

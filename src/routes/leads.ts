import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const leadSchema = z.object({
  targetCompany: z.string().min(2),
  reason: z.enum(["credit_approval", "judicial_recovery", "refinancing", "due_diligence", "monitoring"]),
  debtVolume: z.string().optional(),
  desiredDeadline: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email(),
  notes: z.string().optional(),
});

// POST público — landing page envia direto sem auth.
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const lead = await prisma.lead.create({
    data: {
      targetCompany: parsed.data.targetCompany,
      reason: parsed.data.reason,
      debtVolume: parsed.data.debtVolume,
      desiredDeadline: parsed.data.desiredDeadline ? new Date(parsed.data.desiredDeadline) : null,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      notes: parsed.data.notes,
      status: "new",
    },
  });
  res.status(201).json({ id: lead.id });
});

// GET autenticado — lista interna.
router.get("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const leads = await prisma.lead.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(leads);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id || typeof id !== "string") { res.status(404).json({ error: "ID inválido" }); return; }
  const status = (req.body?.status as string) || undefined;
  const updated = await prisma.lead.update({
    where: { id },
    data: { ...(status ? { status } : {}) },
  });
  res.json(updated);
});

export default router;

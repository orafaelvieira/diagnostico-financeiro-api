import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const companySchema = z.object({
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  setor: z.string().optional(),
  porte: z.string().optional(),
  uf: z.string().optional(),
});

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const companies = await prisma.company.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { analyses: true } } },
  });
  res.json(companies);
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const company = await prisma.company.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  res.status(201).json(company);
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!company) { res.status(404).json({ error: "Empresa não encontrada" }); return; }
  res.json(company);
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

  const parsed = companySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const company = await prisma.company.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(company);
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

  await prisma.company.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;

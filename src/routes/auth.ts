import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/client";
import { env } from "../config/env";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceType: z.enum(["empresa", "consultoria"]).default("consultoria"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: "30d" });
}

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, password, workspaceType } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "E-mail já cadastrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, workspaceType },
    select: { id: true, name: true, email: true, workspaceType: true },
  });

  res.status(201).json({ user, token: signToken(user.id) });
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email, workspaceType: user.workspaceType },
    token: signToken(user.id),
  });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, workspaceType: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(user);
});

export default router;

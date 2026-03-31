import "dotenv/config";
import express from "express";
import cors from "cors";
import { env } from "./config/env";

import authRouter from "./routes/auth";
import companiesRouter from "./routes/companies";
import analysesRouter from "./routes/analyses";
import documentsRouter from "./routes/documents";
import dictionaryRouter from "./routes/dictionary";

const app = express();

app.use(cors({
  origin: [
    env.frontendUrl,
    "https://walrus-app-bizfv.ondigitalocean.app",
    "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/companies", companiesRouter);
app.use("/analyses", analysesRouter);
app.use("/documents", documentsRouter);
app.use("/dictionary", dictionaryRouter);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

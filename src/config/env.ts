import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "3001"),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  spaces: {
    endpoint: process.env.SPACES_ENDPOINT ?? "",
    region: process.env.SPACES_REGION ?? "nyc3",
    bucket: process.env.SPACES_BUCKET ?? "",
    key: process.env.SPACES_KEY ?? "",
    secret: process.env.SPACES_SECRET ?? "",
    enabled: !!process.env.SPACES_KEY,
  },
};

import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { runSeed } from "../../prisma/seed";

export const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/erp_test?schema=public";

export default async function globalSetup(): Promise<void> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
  const db = new PrismaClient();
  try {
    await runSeed(db);
  } finally {
    await db.$disconnect();
  }
}
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const prisma = new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return prisma;
}
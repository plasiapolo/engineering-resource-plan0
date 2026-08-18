import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed";

async function reset() {
  const prisma = new PrismaClient();
  console.log("Dropping schema and recreating…");
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS "public" CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA "public"');
  console.log("Pushing schema…");
  await prisma.$disconnect();
  execSync("npx prisma db push", { stdio: "inherit" });
  await runSeed(new PrismaClient());
}

if (require.main === module) {
  reset()
    .then(() => {
      console.log("Reset to seed finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
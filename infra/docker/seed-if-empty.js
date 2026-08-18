const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

(async () => {
  const count = await db.project.count();
  if (count > 0) {
    console.log("Database already contains projects - skipping seed.");
    return;
  }
  console.log("Empty database - running seed...");
  const { runSeed } = require("/app/apps/server/dist/prisma/seed.js");
  await runSeed(db);
})().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => db.$disconnect());
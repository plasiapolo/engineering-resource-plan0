import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webRoot, "..", "..");

const DB_URL = "postgresql://postgres:postgres@localhost:5432/erp_test?schema=public";

function run(cmd, cwd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, DATABASE_URL: DB_URL } });
}

console.log("Preparing e2e environment (server build + test database).");
run(`npm run build -w apps/server`, repoRoot);
run(`npm run db:push -w apps/server`, repoRoot);
run(`npm run db:seed -w apps/server`, repoRoot);
console.log("E2E environment ready.");
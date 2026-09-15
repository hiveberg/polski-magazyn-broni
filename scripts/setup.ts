import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dataDir = resolve(root, "data");
for (const dir of [dataDir, resolve(dataDir, "uploads"), resolve(dataDir, "backups"), resolve(dataDir, "logs")]) mkdirSync(dir, { recursive: true });

process.env.DATABASE_URL ??= "file:../data/database.sqlite";
const commands = [
  { command: "npx", args: ["prisma", "generate"] },
  { command: process.execPath, args: ["--import", "tsx", "scripts/migrate.ts"] },
  { command: process.execPath, args: ["--import", "tsx", "prisma/seed.ts"] },
];
for (const { command, args } of commands) {
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nPMBP — Polski Magazyn Broni Palnej jest gotowy.");
console.log("Strona projektu: https://pmbp.pl");
console.log("Pierwsze logowanie: admin / admin (system wymusi utworzenie właściwego administratora). ");
console.log("Uruchom: npm run dev");

import { rmSync } from "node:fs";
import { resolve } from "node:path";

const database = resolve(process.cwd(), "tmp/e2e-database.sqlite");
for (const path of [database, `${database}-wal`, `${database}-shm`]) rmSync(path, { force: true });

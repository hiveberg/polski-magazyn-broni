import { rmSync } from "node:fs";
import { resolve } from "node:path";

const database = resolve(process.cwd(), "tmp/vitest-database.sqlite");
const dataDirectory = resolve(process.cwd(), "tmp/vitest-data");
process.env.DATABASE_URL = `file:${database}`;
process.env.PMB_DATA_DIR = dataDirectory;
process.env.TZ = "Europe/Warsaw";

for (const path of [database, `${database}-wal`, `${database}-shm`]) rmSync(path, { force: true });
rmSync(dataDirectory, { recursive: true, force: true });

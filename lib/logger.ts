import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logsPath } from "@/lib/paths";

export async function logTechnical(level: "info" | "error", event: string, details: Record<string, unknown> = {}) {
  try {
    await mkdir(logsPath, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const safeDetails = Object.fromEntries(Object.entries(details).filter(([key]) => !/password|pin|secret|token|documentContent/i.test(key)));
    await appendFile(join(logsPath, `app-${day}.log`), `${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safeDetails })}\n`, { mode: 0o600 });
  } catch {
    // Logowanie nie może przerwać operacji biznesowej ani obsługi błędu.
  }
}

import { prisma } from "@/lib/db";
import { createBackup } from "@/lib/backup";
import { logTechnical } from "@/lib/logger";

declare global { var pmbBackupTimer: NodeJS.Timeout | undefined; }

async function tick() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "backupSchedule" } }).catch(() => null);
  const schedule = (setting?.value ?? { enabled: true, hour: 2, minute: 0 }) as { enabled?: boolean; hour?: number; minute?: number };
  if (!schedule.enabled) return;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value); const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour !== (schedule.hour ?? 2) || minute !== (schedule.minute ?? 0)) return;
  const latest = await prisma.backupRecord.findFirst({ where: { type: "AUTO", status: "SUCCESS" }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < 20 * 60 * 60 * 1000) return;
  await createBackup("AUTO");
}

export function startBackupScheduler() {
  if (globalThis.pmbBackupTimer) return;
  const handleError = (error: unknown) => { console.error("Automatyczny backup nie powiódł się", error); void logTechnical("error", "AUTO_BACKUP_FAILED", { message: error instanceof Error ? error.message.slice(0, 1000) : "Nieznany błąd" }); };
  void tick().catch(handleError);
  globalThis.pmbBackupTimer = setInterval(() => void tick().catch(handleError), 60_000);
  globalThis.pmbBackupTimer.unref();
}

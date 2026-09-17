import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/admin-controls";
import { parseDashboardActionColors } from "@/lib/settings";

export const metadata = { title: "Ustawienia" };
export default async function Page() {
  await requireUser({ admin: true }); const [inactive, grouping, colors, backup] = await Promise.all([prisma.systemSetting.findUnique({ where: { key: "showInactiveWeaponsInGrid" } }), prisma.systemSetting.findUnique({ where: { key: "groupWeaponsByType" } }), prisma.systemSetting.findUnique({ where: { key: "dashboardActionColors" } }), prisma.systemSetting.findUnique({ where: { key: "backupSchedule" } })]); const schedule = (backup?.value ?? { hour: 2, minute: 0 }) as { hour?: number; minute?: number };
  return <div className="page"><PageHeader eyebrow="Administracja" title="Ustawienia systemu" description="Ustawienia lokalne tej instalacji." /><section className="page-card"><SettingsForm showInactive={inactive?.value !== false} groupWeaponsByType={grouping?.value !== false} dashboardActionColors={parseDashboardActionColors(colors?.value)} backupHour={schedule.hour ?? 2} backupMinute={schedule.minute ?? 0} /></section></div>;
}

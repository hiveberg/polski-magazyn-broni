import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/auth-form";
import { ProductSignature } from "@/components/product-branding";

export const metadata = { title: "Ustaw własne hasło" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true }); const current = await prisma.user.findUnique({ where: { id: user.id }, select: { pinHash: true } });
  return <main className="auth-page"><section className="auth-card"><header className="auth-banner"><h1>Ustaw własne hasło</h1><p>Hasło jednorazowe nie może służyć do normalnej pracy.</p></header><div className="auth-body"><ChangePasswordForm needsPin={!current?.pinHash} /><p className="auth-note">Dane są przechowywane wyłącznie w tej instalacji.</p><ProductSignature /></div></section></main>;
}

import { requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/auth-form";

export const metadata = { title: "Pierwsza konfiguracja" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireUser({ allowBootstrap: true, allowPasswordChange: true });
  return <main className="auth-page"><section className="auth-card"><header className="auth-banner"><h1>Pierwsza konfiguracja</h1><p>Utwórz właściwego administratora. Konto admin/admin zostanie wyłączone.</p></header><div className="auth-body"><OnboardingForm /><p className="auth-branding">Polski Magazyn Broni • konfiguracja lokalna</p></div></section></main>;
}

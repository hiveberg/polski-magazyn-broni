import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth-form";

export const metadata = { title: "Logowanie" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  if (await currentUser()) redirect("/");
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card"><header className="auth-banner"><h1>Polski Magazyn Broni</h1><p>Bezpieczna lokalna ewidencja broni i amunicji.</p></header><div className="auth-body">{params.onboarding === "complete" && <div className="success-box" style={{ marginBottom: 16 }}>Administrator został utworzony. Zaloguj się hasłem jednorazowym.</div>}<LoginForm /><p className="auth-branding">Integral Dot sp. z o.o.</p></div></section></main>;
}

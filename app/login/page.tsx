import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth-form";
import { ProductSignature, ProductWordmark } from "@/components/product-branding";
import { InlineAlert } from "@/components/ui-system";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata = { title: "Logowanie" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  if (await currentUser()) redirect("/");
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card"><header className="auth-banner"><div className="auth-brand-lockup"><ProductWordmark className="auth-brand-code" /><div className="auth-brand-title"><h1>{PRODUCT_NAME}</h1><span>Ewidencja. Kontrola. Bezpieczeństwo.</span></div></div><p>Bezpieczna lokalna ewidencja broni palnej i amunicji.</p></header><div className="auth-body">{params.onboarding === "complete" && <InlineAlert tone="success">Administrator został utworzony. Zaloguj się hasłem jednorazowym.</InlineAlert>}<LoginForm /><ProductSignature suffix="Integral Dot sp. z o.o." /></div></section></main>;
}

"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

async function submit(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Nie udało się wykonać operacji.");
  window.location.assign(result.redirect);
}

export function LoginForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true); const data = new FormData(event.currentTarget);
    try { await submit("/api/auth/login", { login: data.get("login"), password: data.get("password") }); } catch (err) { setError(err instanceof Error ? err.message : "Błąd logowania."); setLoading(false); }
  }
  return <form className="form-stack" onSubmit={onSubmit}>{error && <div className="error-box" role="alert">{error}</div>}<div className="field"><label htmlFor="login">Login</label><input className="input" id="login" name="login" autoComplete="username" autoFocus required /></div><div className="field"><label htmlFor="password">Hasło</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div><button className="button primary" disabled={loading}><LockKeyhole size={17} />{loading ? "Logowanie…" : "Zaloguj"}</button></form>;
}

export function OnboardingForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true); const data = new FormData(event.currentTarget);
    try { await submit("/api/auth/onboarding", { firstName: data.get("firstName"), lastName: data.get("lastName"), login: data.get("login"), temporaryPassword: data.get("temporaryPassword") }); } catch (err) { setError(err instanceof Error ? err.message : "Błąd konfiguracji."); setLoading(false); }
  }
  return <form className="form-stack" onSubmit={onSubmit}>{error && <div className="error-box" role="alert">{error}</div>}<div className="form-grid"><div className="field"><label htmlFor="firstName">Imię</label><input className="input" id="firstName" name="firstName" autoFocus required /></div><div className="field"><label htmlFor="lastName">Nazwisko</label><input className="input" id="lastName" name="lastName" required /></div><div className="field full"><label htmlFor="login">Login administratora</label><input className="input" id="login" name="login" autoComplete="username" required /></div><div className="field full"><label htmlFor="temporaryPassword">Hasło jednorazowe</label><input className="input" id="temporaryPassword" name="temporaryPassword" type="password" autoComplete="new-password" minLength={12} required /><span className="small muted">Minimum 12 znaków, wielka i mała litera oraz cyfra.</span></div></div><button className="button primary" disabled={loading}><ShieldCheck size={17} />{loading ? "Tworzenie…" : "Utwórz administratora"}</button></form>;
}

export function ChangePasswordForm({ needsPin }: { needsPin: boolean }) {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true); const data = new FormData(event.currentTarget);
    try { await submit("/api/auth/change-password", { password: data.get("password"), confirmation: data.get("confirmation"), pin: data.get("pin") }); } catch (err) { setError(err instanceof Error ? err.message : "Błąd zmiany hasła."); setLoading(false); }
  }
  return <form className="form-stack" onSubmit={onSubmit}>{error && <div className="error-box" role="alert">{error}</div>}<div className="field"><label htmlFor="password">Nowe hasło</label><input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={12} autoFocus required /></div><div className="field"><label htmlFor="confirmation">Powtórz hasło</label><input className="input" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></div>{needsPin && <div className="field"><label htmlFor="pin">Twój 4-cyfrowy PIN operacyjny</label><input className="input pin-input" id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" required /></div>}<button className="button primary" disabled={loading}><ShieldCheck size={17} />{loading ? "Zapisywanie…" : "Zapisz i przejdź do pulpitu"}</button></form>;
}

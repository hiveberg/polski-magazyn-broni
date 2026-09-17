"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { InlineAlert } from "@/components/ui-system";

async function send(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}

export function WeaponHistoryControls({ weaponId, openFlags }: { weaponId: string; entries?: unknown[]; openFlags: { id: string; reason: string }[] }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const router = useRouter();
  async function flag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setError("");
    try { await send("/api/verification-flags", { weaponId, reason: data.get("reason") }); setMessage("Pozycję dodano do raportu kontroli."); form.reset(); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Błąd."); }
  }
  return <div className="form-stack">{error && <InlineAlert tone="error">{error}</InlineAlert>}{message && <InlineAlert tone="success">{message}</InlineAlert>}<form className="form-stack" onSubmit={flag}><h3>Kontrola fizyczna</h3><div className="field"><label htmlFor="reason">Powód oznaczenia</label><input className="input" id="reason" name="reason" required minLength={5} /></div><button className="button" style={{ width: "fit-content" }}>Oznacz do sprawdzenia</button></form>{openFlags.map((item) => <InlineAlert tone="warning" key={item.id}>{item.reason} <button className="button" onClick={async () => { await send("/api/verification-flags", { id: item.id }, "PATCH"); router.refresh(); }}>Oznacz jako sprawdzone</button></InlineAlert>)}</div>;
}

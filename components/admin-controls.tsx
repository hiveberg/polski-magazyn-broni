"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";

export function UserStatusButton({ id, active }: { id: string; active: boolean }) {
  const [loading, setLoading] = useState(false); return <button className={`button ${active ? "danger" : ""}`} disabled={loading} onClick={async () => { setLoading(true); const response = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !active }) }); const body = await response.json(); if (!response.ok) { alert(body.error); setLoading(false); } else window.location.reload(); }}>{active ? "Dezaktywuj" : "Aktywuj"}</button>;
}

export function SettingsForm({ showInactive, backupHour, backupMinute }: { showInactive: boolean; backupHour: number; backupMinute: number }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); setMessage(""); const data = new FormData(event.currentTarget); const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showInactiveWeaponsInGrid: data.get("showInactive") === "on", backupHour: Number(data.get("backupHour")), backupMinute: Number(data.get("backupMinute")) }) }); const body = await response.json(); if (!response.ok) setError(body.error); else setMessage("Ustawienia zostały zapisane."); setLoading(false); }
  return <form className="form-stack" onSubmit={submit}>{error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}<label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" name="showInactive" defaultChecked={showInactive} /> Pokazuj wycofane i nieaktywne egzemplarze w gridzie wydawania</label><div className="form-grid"><div className="field"><label htmlFor="backupHour">Godzina automatycznego backupu</label><input className="input" id="backupHour" name="backupHour" type="number" min="0" max="23" defaultValue={backupHour} /></div><div className="field"><label htmlFor="backupMinute">Minuta</label><input className="input" id="backupMinute" name="backupMinute" type="number" min="0" max="59" defaultValue={backupMinute} /></div></div><button className="button primary" disabled={loading} style={{ width: "fit-content" }}><Save size={17} />Zapisz ustawienia</button></form>;
}

export function PrintButton() { return <button className="button no-print" onClick={() => window.print()}>Drukuj / zapisz jako PDF</button>; }

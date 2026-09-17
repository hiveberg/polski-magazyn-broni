"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Check, Plus, Search, UserRoundPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { InlineAlert } from "@/components/ui-system";

export type RecipientValue = { recipientId: string | null; name: string; reference: string };
type RecipientOption = { id: string; name: string; reference: string | null };

async function json(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Nie udało się wykonać operacji.");
  return body;
}

export function RecipientPicker({ value, onChange, autoFocus = false }: { value: RecipientValue; onChange: (value: RecipientValue) => void; autoFocus?: boolean }) {
  const reactId = useId();
  const id = `recipient-${reactId.replace(/:/g, "")}`;
  const [results, setResults] = useState<RecipientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReference, setNewReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value.recipientId || value.name.trim().length < 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/recipients?search=${encodeURIComponent(value.name)}&limit=5`, { signal: controller.signal })
        .then(json)
        .then((body) => { setResults(body.recipients); setOpen(true); })
        .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); });
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value.name, value.recipientId]);

  function select(recipient: RecipientOption) {
    onChange({ recipientId: recipient.id, name: recipient.name, reference: recipient.reference ?? "" });
    setOpen(false); setAdding(false); setError("");
  }

  function startAdding() { setNewName(value.name); setNewReference(value.reference); setAdding(true); setOpen(false); }

  async function create() {
    if (newName.trim().length < 2) return setError("Nazwa odbiorcy musi mieć co najmniej 2 znaki.");
    setLoading(true); setError("");
    try {
      const body = await json(await fetch("/api/recipients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, reference: newReference }) }));
      select(body.recipient);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać odbiorcy."); }
    finally { setLoading(false); }
  }

  return <div className="recipient-picker form-stack">
    {error && <InlineAlert tone="error">{error}</InlineAlert>}
    <div className="field recipient-name-field">
      <label htmlFor={`${id}-name`}>Imię i nazwisko / nazwa odbiorcy</label>
      <div className="recipient-input"><Search aria-hidden /><input className="input" id={`${id}-name`} value={value.name} autoFocus={autoFocus} autoComplete="off" onFocus={() => { if (!value.recipientId && value.name) setOpen(true); }} onChange={(event) => { const name = event.target.value; onChange({ recipientId: null, name, reference: value.reference }); setAdding(false); if (!name.trim()) { setResults([]); setOpen(false); } }} /></div>
      {value.recipientId && <span className="selected-recipient"><Check aria-hidden />Wybrano z listy <button type="button" onClick={() => onChange({ ...value, recipientId: null })} aria-label="Zrezygnuj z powiązania z listą"><X /></button></span>}
      {open && !value.recipientId && <div className="recipient-results" role="listbox">
        {results.map((recipient) => <button type="button" role="option" aria-selected="false" key={recipient.id} onMouseDown={(event) => event.preventDefault()} onClick={() => select(recipient)}><span>{recipient.name}</span><small>{recipient.reference || "Bez identyfikatora"}</small></button>)}
        <button type="button" className="recipient-add-option" onMouseDown={(event) => event.preventDefault()} onClick={startAdding}><UserRoundPlus aria-hidden />Dodaj nowego odbiorcę</button>
      </div>}
    </div>
    <div className="field"><label htmlFor={`${id}-reference`}>Numer dokumentu lub identyfikator</label><input className="input" id={`${id}-reference`} value={value.reference} onChange={(event) => onChange({ recipientId: null, name: value.name, reference: event.target.value })} /></div>
    {!value.recipientId && value.name.trim().length > 0 && !adding && <button type="button" className="inline-link-button" onClick={startAdding}><Plus aria-hidden />Dodaj wpisany tekst do listy odbiorców</button>}
    {adding && <div className="inline-create-card"><strong>Nowy odbiorca</strong><div className="form-grid"><div className="field"><label htmlFor={`${id}-new-name`}>Nazwa odbiorcy</label><input className="input" id={`${id}-new-name`} value={newName} onChange={(event) => setNewName(event.target.value)} required minLength={2} /></div><div className="field"><label htmlFor={`${id}-new-reference`}>Identyfikator (opcjonalnie)</label><input className="input" id={`${id}-new-reference`} value={newReference} onChange={(event) => setNewReference(event.target.value)} /></div></div><div className="button-row"><button type="button" className="button primary compact" disabled={loading} onClick={() => void create()}><UserRoundPlus aria-hidden />{loading ? "Dodawanie…" : "Dodaj i wybierz"}</button><button type="button" className="button compact" onClick={() => setAdding(false)}>Anuluj</button></div></div>}
  </div>;
}

export function RecipientForm() {
  const router = useRouter(); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError(""); setMessage("");
    try { await json(await fetch("/api/recipients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), reference: data.get("reference") }) })); form.reset(); setMessage("Odbiorca został dodany."); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać odbiorcy."); }
    finally { setLoading(false); }
  }
  return <form className="form-stack" onSubmit={submit}>{error && <InlineAlert tone="error">{error}</InlineAlert>}{message && <InlineAlert tone="success">{message}</InlineAlert>}<div className="form-grid"><div className="field"><label htmlFor="recipient-admin-name">Imię i nazwisko / nazwa odbiorcy</label><input className="input" id="recipient-admin-name" name="name" required minLength={2} /></div><div className="field"><label htmlFor="recipient-admin-reference">Numer dokumentu lub identyfikator</label><input className="input" id="recipient-admin-reference" name="reference" /></div></div><button className="button primary" disabled={loading}><UserRoundPlus aria-hidden />{loading ? "Dodawanie…" : "Dodaj odbiorcę"}</button></form>;
}

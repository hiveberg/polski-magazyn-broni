"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FilePlus2 } from "lucide-react";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { InlineAlert, useCreateComplete } from "@/components/ui-system";

export type DocumentOption = { id: string; type: string; number: string | null; documentDate: string; description: string; parties: string | null };

async function parseResponse(response: Response) {
  const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Nie udało się zapisać dokumentu."); return body;
}

export function DocumentForm({ onCreated, compact = false }: { onCreated?: (document: DocumentOption) => void; compact?: boolean }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const router = useRouter(); const completeCreate = useCreateComplete();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation(); const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError("");
    try {
      const result = await parseResponse(await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: data.get("type"), number: data.get("number") || undefined, documentDate: data.get("documentDate"), description: data.get("description"), parties: data.get("parties") || undefined }) }));
      const files = data.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
      for (const file of files) { const upload = new FormData(); upload.set("documentId", result.document.id); upload.set("file", file); await parseResponse(await fetch("/api/attachments", { method: "POST", body: upload })); }
      const document = { ...result.document, documentDate: new Date(result.document.documentDate).toISOString() } as DocumentOption;
      form.reset(); onCreated?.(document); router.refresh(); if (!onCreated) completeCreate();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się zapisać dokumentu."); }
    finally { setLoading(false); }
  }
  return <form className="form-stack" onSubmit={submit}>{error && <InlineAlert tone="error">{error}</InlineAlert>}<div className={`form-grid ${compact ? "compact" : ""}`}><div className="field"><label htmlFor="document-type">Typ dokumentu</label><select className="select" id="document-type" name="type"><option value="INVOICE">Faktura</option><option value="AGREEMENT">Umowa</option><option value="TRANSFER_DOCUMENT">Dokument przekazania</option><option value="WITHDRAWAL_DOCUMENT">Dokument wycofania</option><option value="AUTHORIZATION">Upoważnienie</option><option value="OTHER">Inny</option></select></div><TextField label="Numer / oznaczenie" name="number" /><TextField label="Data dokumentu" name="documentDate" type="date" required /><TextField label="Opis / nazwa" name="description" required full /><TextField label="Strony / podmioty" name="parties" full /><div className="field full"><AttachmentUploader /></div></div><button className="button primary" disabled={loading}><FilePlus2 aria-hidden />{loading ? "Zapisywanie…" : "Zapisz dokument"}</button></form>;
}

function TextField({ label, name, type = "text", required, full }: { label: string; name: string; type?: string; required?: boolean; full?: boolean }) {
  return <div className={`field ${full ? "full" : ""}`}><label htmlFor={`document-${name}`}>{label}</label><input className="input" id={`document-${name}`} name={name} type={type} required={required} /></div>;
}

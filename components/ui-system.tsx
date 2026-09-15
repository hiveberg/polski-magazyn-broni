"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, Plus, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";

type AlertTone = "success" | "error" | "warning" | "info";

export function InlineAlert({ tone = "info", children, role }: { tone?: AlertTone; children: React.ReactNode; role?: "alert" | "status" }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : tone === "warning" ? TriangleAlert : Info;
  return <div className={`inline-alert ${tone}`} role={role ?? (tone === "error" ? "alert" : "status")}><Icon aria-hidden /><span>{children}</span></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-state-icon"><Info aria-hidden /></div><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function Modal({ open, title, description, onClose, size = "medium", children }: { open: boolean; title: string; description?: string; onClose: () => void; size?: "small" | "medium" | "large"; children: React.ReactNode }) {
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal-card ${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="close-button" onClick={onClose} aria-label="Zamknij"><X /></button></header><div className="modal-content">{children}</div></section></div>, document.body);
}

const CreatePanelContext = createContext<(() => void) | null>(null);

export function useCreateComplete() {
  const value = useContext(CreatePanelContext);
  return value ?? (() => undefined);
}

export function CreatePanel({ hasItems, title, buttonLabel, children }: { hasItems: boolean; title: string; buttonLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(!hasItems); const [saved, setSaved] = useState(false); const router = useRouter();
  const complete = useCallback(() => { setOpen(false); setSaved(true); router.refresh(); }, [router]);
  return <section className="page-card create-panel"><div className="split-heading"><h2 className="section-heading">{title}</h2>{hasItems && <button type="button" className="button primary" onClick={() => { setSaved(false); setOpen((value) => !value); }}><Plus aria-hidden />{open ? "Zamknij formularz" : buttonLabel}</button>}</div>{saved && <InlineAlert tone="success">Rekord został zapisany i jest już widoczny na liście.</InlineAlert>}{open && <CreatePanelContext.Provider value={complete}>{children}</CreatePanelContext.Provider>}</section>;
}

export function SuccessNextActions({ title, summary, details, children }: { title: string; summary: string; details?: React.ReactNode; children: React.ReactNode }) {
  return <section className="success-next"><CheckCircle2 aria-hidden /><div><p className="eyebrow">Operacja zakończona</p><h2>{title}</h2><p className="success-summary">{summary}</p>{details}<div className="success-actions">{children}</div></div></section>;
}

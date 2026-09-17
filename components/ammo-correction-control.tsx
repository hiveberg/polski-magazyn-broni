"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, RotateCcw, ShieldCheck } from "lucide-react";
import { PinConfirmDialog } from "@/components/pin-confirm-dialog";
import { InlineAlert } from "@/components/ui-system";

export type CorrectionEntry = {
  id: string;
  registryRef: string;
  caliber: string;
  ammunitionType: string | null;
  basis: string;
  kind: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  effectiveAt: string;
  available: number;
};

export type CorrectionBook = {
  id: string;
  series: string;
  name: string;
  entries: CorrectionEntry[];
};

type PendingCorrection = { entryId: string; quantityDelta: number; note: string };
type CorrectionResult = { registryRef: string; bookId: string; bookLabel: string; quantityDelta: number; sourceRef: string };

export function AmmoCorrectionForm({ books }: { books: CorrectionBook[] }) {
  const router = useRouter();
  const [bookId, setBookId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pending, setPending] = useState<PendingCorrection | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const selectedBook = useMemo(() => books.find((book) => book.id === bookId), [bookId, books]);
  const selectedEntry = useMemo(() => selectedBook?.entries.find((entry) => entry.id === entryId), [entryId, selectedBook]);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEntry) return setError("Wybierz pozycję ewidencji, której dotyczy korekta.");
    const data = new FormData(event.currentTarget);
    const quantityDelta = Number(data.get("quantityDelta"));
    const note = String(data.get("note") ?? "").trim();
    if (!Number.isInteger(quantityDelta) || quantityDelta >= 0) return setError("Wpisz ujemną liczbę całkowitą.");
    if (Math.abs(quantityDelta) > selectedEntry.available) return setError(`Dostępny stan pozwala na korektę najwyżej -${selectedEntry.available} szt.`);
    if (note.length < 5) return setError("Uwaga musi mieć co najmniej 5 znaków.");
    setPending({ entryId: selectedEntry.id, quantityDelta, note });
    setPinOpen(true);
    setError("");
  }

  async function confirm(pin: string) {
    if (!pending || !selectedBook || !selectedEntry) return;
    const response = await fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pending, pin }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Nie udało się zapisać korekty.");
    setResult({ registryRef: body.correction.entry.registryRef, bookId: selectedBook.id, bookLabel: `${selectedBook.series} — ${selectedBook.name}`, quantityDelta: pending.quantityDelta, sourceRef: selectedEntry.registryRef });
    setPinOpen(false);
    setPending(null);
    setBookId("");
    setEntryId("");
    router.refresh();
  }

  if (result) return <section className="page-card success-next correction-success"><div className="success-icon"><ShieldCheck aria-hidden /></div><div><h2>Korekta została zapisana</h2><p>Pozycję <strong>{result.sourceRef}</strong> skorygowano o <strong>{result.quantityDelta.toLocaleString("pl-PL")} szt.</strong> Nowy wpis otrzymał numer <strong>{result.registryRef}</strong>.</p><p className="muted small">Księga: {result.bookLabel}. Oryginalna pozycja pozostała bez zmian.</p><div className="button-row"><Link className="button primary" href={`/registers/ammunition?book=${result.bookId}`}><BookOpen aria-hidden />Otwórz ewidencję</Link><button className="button" type="button" onClick={() => setResult(null)}><RotateCcw aria-hidden />Dodaj kolejną korektę</button></div></div></section>;

  return <section className="page-card correction-workspace"><form className="form-stack" onSubmit={prepare}>{error && <InlineAlert tone="error">{error}</InlineAlert>}<div className="form-grid correction-selectors"><div className="field"><label htmlFor="correction-book">Rejestr amunicji</label><select className="select" id="correction-book" value={bookId} onChange={(event) => { setBookId(event.target.value); setEntryId(""); setError(""); }} required><option value="">Wybierz rejestr…</option>{books.map((book) => <option key={book.id} value={book.id}>{book.series} — {book.name}</option>)}</select></div><div className="field"><label htmlFor="correction-entry">Pozycja ewidencji</label><select className="select" id="correction-entry" value={entryId} onChange={(event) => { setEntryId(event.target.value); setError(""); }} disabled={!selectedBook} required><option value="">{selectedBook ? "Wybierz pozycję…" : "Najpierw wybierz rejestr"}</option>{selectedBook?.entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.registryRef} — {entry.caliber}{entry.ammunitionType ? ` / ${entry.ammunitionType}` : ""} — {entry.quantityIn ? `przychód ${entry.quantityIn}` : `rozchód ${entry.quantityOut}`} szt. — dostępne {entry.available}</option>)}</select></div></div>{selectedEntry && <section className="correction-entry-preview" aria-label="Wybrana pozycja"><div><span className="eyebrow">WYBRANA POZYCJA</span><h2>{selectedEntry.registryRef} — {selectedEntry.caliber}{selectedEntry.ammunitionType ? ` / ${selectedEntry.ammunitionType}` : ""}</h2><p className="muted">{selectedEntry.basis}</p></div><dl className="correction-entry-stats"><div><dt>Rodzaj wpisu</dt><dd>{selectedEntry.kind === "ACQUISITION" ? "Przychód" : selectedEntry.kind === "CORRECTION" ? "Korekta" : "Rozchód"}</dd></div><div><dt>Stan po wpisie</dt><dd>{selectedEntry.balanceAfter.toLocaleString("pl-PL")} szt.</dd></div><div><dt>Dostępne obecnie</dt><dd>{selectedEntry.available.toLocaleString("pl-PL")} szt.</dd></div><div><dt>Data wpisu</dt><dd>{selectedEntry.effectiveAt}</dd></div></dl></section>}<div className="form-grid"><div className="field"><label htmlFor="correction-quantity">Korekta ilości ze znakiem minus</label><input className="input no-spinner" id="correction-quantity" name="quantityDelta" type="number" min={selectedEntry ? -selectedEntry.available : undefined} max="-1" step="1" placeholder="np. -5" disabled={!selectedEntry || selectedEntry.available <= 0} required /><small className="muted">Korekta nie może przekroczyć aktualnego stanu dostępnego w wybranej księdze i kalibrze.</small></div><div className="field"><label htmlFor="correction-note">Uwagi do korekty</label><textarea className="textarea" id="correction-note" name="note" minLength={5} placeholder="Opisz przyczynę i zakres korekty…" disabled={!selectedEntry || selectedEntry.available <= 0} required /></div></div>{selectedEntry && selectedEntry.available <= 0 && <InlineAlert tone="warning">Dla kalibru tej pozycji nie ma obecnie dostępnego stanu, który można pomniejszyć.</InlineAlert>}<button className="button primary full-width" disabled={!selectedEntry || selectedEntry.available <= 0}><ShieldCheck aria-hidden />Zapisz korektę i potwierdź PIN-em</button></form><PinConfirmDialog open={pinOpen} title="Potwierdź korektę amunicji" onClose={() => setPinOpen(false)} onConfirm={confirm} /></section>;
}

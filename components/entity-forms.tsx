"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Download, FileArchive, Plus, Search, ShieldCheck, Upload } from "lucide-react";
import { PinConfirmDialog } from "@/components/pin-confirm-dialog";
import { BookPicker, CaliberPicker, DocumentPicker, type BookOption, type CaliberOption } from "@/components/pickers";
import type { DocumentOption } from "@/components/document-form";
import { InlineAlert, SuccessNextActions, useCreateComplete } from "@/components/ui-system";
import { RecipientPicker, type RecipientValue } from "@/components/recipient-controls";
import { planAmmoAllocation } from "@/lib/ammunition-allocation";
import { formatDateTime } from "@/lib/utils";

export { DocumentForm } from "@/components/document-form";

type WeaponOption = { id: string; name: string; registryRef: string };
type ActiveAmmoIssueOption = { id: string; registryRef: string; recipientName: string; recipientReference?: string | null; quantityIssued: number; caliberSnapshot: string; caliberId: string; ammunitionType: string; issuedAt: string; allocations: { bookId: string; quantity: number; book: { series: string; name: string } }[]; weapon?: { id: string; registryRef: string } | null };
type ReturnAmmoIssueOption = ActiveAmmoIssueOption;
type AmmoSourceBookOption = BookOption & { available: number };
type AmmoCaliberOption = CaliberOption & { totalAvailable: number; books: AmmoSourceBookOption[] };
type AmmoIssuePayload = { bookId: string; sourceBookId?: string; caliberId: string; ammunitionType: string; quantity: number; recipientId?: string; recipientName: string; recipientReference?: string; parentIssueId?: string };
type AmmoIssueResult = { registryRef: string; caliberSnapshot: string; quantityIssued: number; recipientName: string; allocations: { bookId: string; bookSeries: string; bookName: string; quantity: number }[] };

async function requestJson(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Nie udało się wykonać operacji."); return result;
}

function usePinMutation<T>(perform: (payload: T, pin: string) => Promise<void>) {
  const [pending, setPending] = useState<T | null>(null); const [error, setError] = useState("");
  return { error, setError, request: (payload: T) => { setError(""); setPending(payload); }, dialog: <PinConfirmDialog open={pending !== null} onClose={() => setPending(null)} onConfirm={async (pin) => { if (pending === null) return; await perform(pending, pin); setPending(null); }} /> };
}

function Messages({ error, success }: { error?: string; success?: string }) { return <>{error && <InlineAlert tone="error">{error}</InlineAlert>}{success && <InlineAlert tone="success">{success}</InlineAlert>}</>; }
function Submit({ loading = false, children }: { loading?: boolean; children: ReactNode }) { return <button className="button primary" disabled={loading}><ShieldCheck aria-hidden />{children}</button>; }
const nowInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function AddWeaponForm({ books, calibers, documents }: { books: BookOption[]; calibers: CaliberOption[]; documents: DocumentOption[] }) {
  const router = useRouter(); const [version, setVersion] = useState(0); const [weaponType, setWeaponType] = useState<"HANDGUN" | "LONG_GUN" | "">(""); const [created, setCreated] = useState<{ id: string; registryRef: string; name: string; book: string } | null>(null);
  const operation = usePinMutation<Record<string, unknown>>(async (payload, pin) => { const response = await requestJson("/api/weapons", { ...payload, pin }); setCreated({ id: response.weapon.id, registryRef: response.weapon.registryRef, name: String(payload.name), book: books.find((book) => book.id === payload.bookId)?.series ?? "—" }); setWeaponType(""); setVersion((value) => value + 1); router.refresh(); });
  if (created) return <SuccessNextActions title="Dodano broń" summary={`${created.name} • pozycja ${created.registryRef}`} details={<p>Broń została zewidencjonowana w księdze {created.book}.</p>}><Link className="button primary" href={`/weapons/${created.id}`}>Przejdź do karty broni</Link><button className="button" onClick={() => setCreated(null)}>Dodaj kolejną broń</button><Link className="button" href="/registers/weapons">Otwórz ewidencję</Link></SuccessNextActions>;
  return <><form key={version} className="form-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); operation.request({ bookId: data.get("bookId"), caliberId: data.get("caliberId"), documentId: data.get("documentId"), name: data.get("name"), brand: data.get("brand"), productionYear: data.get("productionYear") || undefined, weaponSeries: data.get("weaponSeries") || undefined, serialNumber: data.get("serialNumber"), otherIdentifyingMarks: data.get("otherIdentifyingMarks") || undefined, accessories: data.get("accessories") || undefined, type: data.get("type") || undefined, magazineCount: data.get("magazineCount"), acquisitionBasis: data.get("acquisitionBasis"), acquisitionDate: data.get("acquisitionDate") || undefined, registeredAt: data.get("registeredAt"), certificateNumber: data.get("certificateNumber") || undefined, notes: data.get("notes") || undefined }); }}><Messages error={operation.error} /><div className="form-grid"><BookPicker label="Księga broni" books={books} /><div className="field weapon-type-field"><span className="field-label">Rodzaj broni (opcjonalnie)</span><input type="hidden" name="type" value={weaponType} /><div className="weapon-type-options"><button type="button" className={weaponType === "HANDGUN" ? "selected" : ""} aria-pressed={weaponType === "HANDGUN"} onClick={() => setWeaponType((current) => current === "HANDGUN" ? "" : "HANDGUN")}><span><Image src="/assets/weapon-placeholder-handgun-outline.png" alt="" fill sizes="150px" /></span><strong>Broń krótka</strong></button><button type="button" className={weaponType === "LONG_GUN" ? "selected" : ""} aria-pressed={weaponType === "LONG_GUN"} onClick={() => setWeaponType((current) => current === "LONG_GUN" ? "" : "LONG_GUN")}><span><Image src="/assets/weapon-placeholder-long-gun-outline.png" alt="" fill sizes="150px" /></span><strong>Broń długa</strong></button></div><small className="muted">Kliknij zaznaczoną miniaturę ponownie, aby pozostawić rodzaj nieokreślony.</small></div><TextField label="Nazwa ewidencyjna" name="name" required /><TextField label="Marka" name="brand" required /><CaliberPicker calibers={calibers} /><TextField label="Rok produkcji" name="productionYear" type="number" /><TextField label="Seria broni" name="weaponSeries" /><TextField label="Numer broni" name="serialNumber" required /><TextField label="Numer świadectwa broni" name="certificateNumber" /><TextField label="Wyposażenie dodatkowe" name="accessories" /><TextField label="Ilość magazynków" name="magazineCount" type="number" defaultValue="0" min={0} /><TextField label="Podstawa nabycia" name="acquisitionBasis" required full /><div className="field full"><DocumentPicker documents={documents} label="Dokument nabycia" /></div><TextField label="Data nabycia" name="acquisitionDate" type="datetime-local" /><TextField label="Data zewidencjonowania" name="registeredAt" type="datetime-local" defaultValue={nowInput()} required /><TextArea label="Inne cechy identyfikacyjne" name="otherIdentifyingMarks" /><TextArea label="Uwagi" name="notes" /></div><Submit>Zapisz i potwierdź PIN-em</Submit></form>{operation.dialog}</>;
}

export function AddAmmoForm({ books, calibers, documents }: { books: BookOption[]; calibers: CaliberOption[]; documents: DocumentOption[] }) {
  const router = useRouter(); const [version, setVersion] = useState(0); const [created, setCreated] = useState<{ registryRef: string; caliber: string; quantity: number; book: string } | null>(null);
  const operation = usePinMutation<Record<string, unknown>>(async (payload, pin) => { const response = await requestJson("/api/ammunition/acquire", { ...payload, pin }); setCreated({ registryRef: response.entry.registryRef, caliber: calibers.find((caliber) => caliber.id === payload.caliberId)?.canonicalName ?? "Amunicja", quantity: Number(payload.quantity), book: books.find((book) => book.id === payload.bookId)?.series ?? "—" }); setVersion((value) => value + 1); router.refresh(); });
  if (created) return <SuccessNextActions title={`Dodano ${created.quantity.toLocaleString("pl-PL")} szt. ${created.caliber}`} summary={`Pozycja ${created.registryRef} • księga ${created.book}`}><button className="button primary" onClick={() => setCreated(null)}>Dodaj kolejną partię</button><Link className="button" href="/registers/ammunition">Otwórz ewidencję</Link><Link className="button" href="/ammunition">Zobacz stan amunicji</Link></SuccessNextActions>;
  return <><form key={version} className="form-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); operation.request({ bookId: data.get("bookId"), caliberId: data.get("caliberId"), documentId: data.get("documentId"), ammunitionType: data.get("ammunitionType") || undefined, quantity: data.get("quantity"), basis: data.get("basis"), effectiveAt: data.get("effectiveAt") }); }}><Messages error={operation.error} /><div className="form-grid"><BookPicker label="Księga amunicji" books={books} /><CaliberPicker calibers={calibers} /><TextField label="Typ amunicji (opcjonalnie)" name="ammunitionType" placeholder="np. pełnopłaszczowa" /><TextField label="Ilość" name="quantity" type="number" required /><TextField label="Podstawa nabycia / przejęcia" name="basis" required full /><div className="field full"><DocumentPicker documents={documents} /></div><TextField label="Data operacji" name="effectiveAt" type="datetime-local" defaultValue={nowInput()} required /></div><Submit>Zapisz i potwierdź PIN-em</Submit></form>{operation.dialog}</>;
}

export function IssueAmmoForm({ issueBooks, calibers, activeIssues }: { issueBooks: BookOption[]; calibers: AmmoCaliberOption[]; activeIssues: ActiveAmmoIssueOption[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"new" | "top-up">("new");
  const [created, setCreated] = useState<AmmoIssueResult | null>(null);
  const [caliberId, setCaliberId] = useState("");
  const [sourceBookId, setSourceBookId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [recipient, setRecipient] = useState<RecipientValue>({ recipientId: null, name: "", reference: "" });
  const [topUpQuery, setTopUpQuery] = useState("");
  const [topUpSelectedId, setTopUpSelectedId] = useState("");
  const [topUpQuantity, setTopUpQuantity] = useState("");
  const [topUpCreated, setTopUpCreated] = useState<{ previousRegistryRef: string; previousQuantityConsumed: number; issue: AmmoIssueResult } | null>(null);
  const selectedCaliber = calibers.find((caliber) => caliber.id === caliberId);
  const selectedSource = selectedCaliber?.books.find((book) => book.id === sourceBookId);
  const available = selectedSource?.available ?? selectedCaliber?.totalAvailable ?? 0;
  const quantityNumber = Number(quantity);
  const plan = selectedCaliber ? planAmmoAllocation(selectedCaliber.books.map((book) => ({ bookId: book.id, available: book.available })), quantityNumber, sourceBookId || undefined) : null;
  const topUpSelected = activeIssues.find((issue) => issue.id === topUpSelectedId) ?? null;
  const topUpAvailable = topUpSelected ? calibers.find((caliber) => caliber.id === topUpSelected.caliberId)?.totalAvailable ?? 0 : 0;
  const topUpNeedle = topUpQuery.toLocaleLowerCase("pl-PL");
  const filteredTopUpIssues = activeIssues.filter((issue) => !topUpNeedle || [issue.registryRef, issue.recipientName, issue.recipientReference ?? "", issue.caliberSnapshot, issue.ammunitionType, issue.weapon?.registryRef ?? "", ...issue.allocations.flatMap((allocation) => [allocation.book.series, allocation.book.name])].join(" ").toLocaleLowerCase("pl-PL").includes(topUpNeedle));
  const operation = usePinMutation<AmmoIssuePayload>(async (payload, pin) => {
    const response = await requestJson("/api/operations/issue-ammo", { ...payload, pin });
    setCreated(response.issue as AmmoIssueResult);
    router.refresh();
  });
  const topUpOperation = usePinMutation<{ issueId: string; quantity: number }>(async (payload, pin) => {
    const response = await requestJson("/api/operations/top-up-ammo", { ...payload, pin });
    setTopUpCreated({ previousRegistryRef: response.previousRegistryRef, previousQuantityConsumed: response.previousQuantityConsumed, issue: response.issue as AmmoIssueResult });
    router.refresh();
  });

  function reset() {
    setCreated(null);
    setCaliberId("");
    setSourceBookId("");
    setQuantity("");
    setRecipient({ recipientId: null, name: "", reference: "" });
    operation.setError("");
  }

  function resetTopUp() {
    setTopUpCreated(null);
    setTopUpSelectedId("");
    setTopUpQuantity("");
    topUpOperation.setError("");
  }

  const newIssueContent = created
    ? <SuccessNextActions title="Wydano amunicję" summary={`${created.quantityIssued.toLocaleString("pl-PL")} szt. ${created.caliberSnapshot} • pozycja ${created.registryRef}`} details={<><p>Odbiorca: <strong>{created.recipientName}</strong></p><p>Zablokowano w {created.allocations.length === 1 ? "księdze" : `${created.allocations.length} księgach`}: {created.allocations.map((allocation) => `${allocation.bookSeries} — ${allocation.bookName}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ")}</p><p className="muted small">Rozchód zostanie zapisany dopiero podczas rozliczenia wydania.</p></>}><button type="button" className="button primary" onClick={reset}>Wydaj kolejną amunicję</button><Link className="button" href="/registers/ammo-issues">Otwórz książkę wydań</Link><Link className="button" href="/ammunition">Zobacz stan amunicji</Link></SuccessNextActions>
    : !calibers.length
      ? <InlineAlert tone="warning">Brak kalibrów z dodatnim stanem. Najpierw zewidencjonuj amunicję.</InlineAlert>
      : <form className="form-stack" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (!selectedCaliber || !Number.isInteger(quantityNumber) || quantityNumber <= 0) return operation.setError("Wybierz kaliber i wpisz prawidłową liczbę sztuk.");
          if (quantityNumber > available) return operation.setError(`Możesz wydać najwyżej ${available.toLocaleString("pl-PL")} szt. z wybranego źródła po uwzględnieniu blokad.`);
          if (recipient.name.trim().length < 2) return operation.setError("Wpisz nazwę odbiorcy.");
          operation.request({ bookId: String(data.get("bookId") ?? ""), sourceBookId: sourceBookId || undefined, caliberId, ammunitionType: String(data.get("ammunitionType") ?? ""), quantity: quantityNumber, recipientId: recipient.recipientId || undefined, recipientName: recipient.name, recipientReference: recipient.reference || undefined });
        }}>
          <Messages error={operation.error} />
          <div className="form-grid">
            <BookPicker label="Księga wydań" name="bookId" books={issueBooks} />
            <CaliberPicker calibers={calibers.map((caliber) => ({ ...caliber, available: caliber.totalAvailable }))} onChange={(id) => { setCaliberId(id); setSourceBookId(""); setQuantity(""); operation.setError(""); }} />
            <div className="field full"><RecipientPicker value={recipient} onChange={setRecipient} /></div>
            <div className="field"><label htmlFor="quantity">Ilość</label><input className="input" id="quantity" name="quantity" type="number" min="1" max={available || undefined} value={quantity} onChange={(event) => { setQuantity(event.target.value); operation.setError(""); }} required /><small className="muted">Dostępne po blokadach: {available.toLocaleString("pl-PL")} szt.</small></div>
            <TextField label="Typ amunicji" name="ammunitionType" defaultValue="pełnopłaszczowa" required />
            <div className="field full"><label htmlFor="sourceBookId">Księga źródłowa (opcjonalnie)</label><select className="select" id="sourceBookId" name="sourceBookId" value={sourceBookId} disabled={!selectedCaliber} onChange={(event) => { setSourceBookId(event.target.value); operation.setError(""); }}><option value="">Dobierz automatycznie — wszystkie dostępne księgi</option>{selectedCaliber?.books.map((book) => <option key={book.id} value={book.id}>{book.series} — {book.name} ({book.available.toLocaleString("pl-PL")} szt. dostępnych)</option>)}</select><small className="muted">Pozostaw dobór automatyczny, aby system użył jednej wystarczającej księgi albo rozdzielił blokadę między kilka.</small></div>
            {plan && quantityNumber > 0 && <div className="field full"><InlineAlert tone={plan.complete ? "info" : "warning"}>{plan.complete ? <>Planowana blokada: {plan.allocations.map((allocation) => { const book = selectedCaliber?.books.find((item) => item.id === allocation.bookId); return `${book?.series} — ${book?.name}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`; }).join("; ")}</> : <>Brakuje {(quantityNumber - plan.available).toLocaleString("pl-PL")} szt. w wybranym zakresie źródeł.</>}</InlineAlert></div>}
          </div>
          <Submit>Wydaj i potwierdź PIN-em</Submit>
        </form>;

  let topUpContent: ReactNode;
  if (topUpCreated) {
    topUpContent = <SuccessNextActions title="Dokładka zapisana" summary={`${topUpCreated.previousRegistryRef}: rozchód ${topUpCreated.previousQuantityConsumed.toLocaleString("pl-PL")} szt. • nowe wydanie ${topUpCreated.issue.registryRef}: ${topUpCreated.issue.quantityIssued.toLocaleString("pl-PL")} szt.`} details={<><p>Zachowano odbiorcę, kaliber, typ amunicji i powiązanie z bronią. Nowa blokada: {topUpCreated.issue.allocations.map((allocation) => `${allocation.bookSeries} — ${allocation.bookName}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ")}.</p><p className="muted small">Poprzednie wydanie rozliczono bez zwrotu, a nowe pozostaje nierozliczone.</p></>}><button type="button" className="button primary" onClick={resetTopUp}>Wykonaj kolejną dokładkę</button><Link className="button" href="/registers/ammo-issues">Otwórz książkę wydań</Link><Link className="button" href="/ammunition">Zobacz stan amunicji</Link></SuccessNextActions>;
  } else if (!activeIssues.length) {
    topUpContent = <InlineAlert tone="info">Brak aktywnych wydań, do których można wykonać dokładkę.</InlineAlert>;
  } else {
    topUpContent = <div className="return-ammo-stack ammo-top-up-stack">
      <label className="return-ammo-search"><Search aria-hidden /><input value={topUpQuery} onChange={(event) => setTopUpQuery(event.target.value)} placeholder="Szukaj po pozycji, odbiorcy, kalibrze, broni lub księdze…" aria-label="Szukaj aktywnego wydania do dokładki" /></label>
      <Messages error={topUpOperation.error} />
      <div className="ammo-return-list">{filteredTopUpIssues.map((issue) => {
        const issueAvailable = calibers.find((caliber) => caliber.id === issue.caliberId)?.totalAvailable ?? 0;
        return <article className={`ammo-return-item ${topUpSelectedId === issue.id ? "selected" : ""}`} key={issue.id}><header><div><span className="badge warn">Nierozliczone</span><h2>{issue.registryRef} — {issue.caliberSnapshot}</h2><p>{issue.ammunitionType} • wydano {formatDateTime(issue.issuedAt)}</p></div><strong>{issue.quantityIssued.toLocaleString("pl-PL")} szt.</strong></header><dl><div><dt>Odbiorca</dt><dd>{issue.recipientName}{issue.recipientReference ? ` • ${issue.recipientReference}` : ""}</dd></div><div><dt>Blokady</dt><dd>{issue.allocations.map((allocation) => `${allocation.book.series} — ${allocation.book.name}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ")}</dd></div>{issue.weapon && <div><dt>Powiązana broń</dt><dd><Link className="registry-link" href={`/weapons/${issue.weapon.id}`}>{issue.weapon.registryRef}</Link></dd></div>}</dl><footer><span className="top-up-availability"><small>Dostępne do dokładki</small><strong>{issueAvailable.toLocaleString("pl-PL")} szt.</strong></span><button type="button" className="button" disabled={issueAvailable <= 0} title={issueAvailable <= 0 ? "Brak dostępnego stanu tego kalibru" : undefined} onClick={() => { setTopUpSelectedId(issue.id); setTopUpQuantity(""); topUpOperation.setError(""); }}><Plus aria-hidden />Dokładka</button></footer></article>;
      })}</div>
      {!filteredTopUpIssues.length && <div className="empty-inline">Brak wydań pasujących do wyszukiwania.</div>}
      {topUpSelected && <form className="confirm-card return-ammo-form" onSubmit={(event) => {
        event.preventDefault();
        const requested = Number(topUpQuantity);
        if (!Number.isInteger(requested) || requested <= 0 || requested > topUpAvailable) return topUpOperation.setError(`Wpisz liczbę od 1 do ${topUpAvailable.toLocaleString("pl-PL")}.`);
        topUpOperation.request({ issueId: topUpSelected.id, quantity: requested });
      }}><div><h2>Dokładka do {topUpSelected.registryRef}</h2><p>Po potwierdzeniu pozycja zostanie rozliczona ze zwrotem 0, a nowe wydanie zachowa odbiorcę i wszystkie powiązania.</p></div><div className="field"><label htmlFor="topUpQuantity">Ilość dokładki</label><input className="input" id="topUpQuantity" type="number" min="1" max={topUpAvailable} value={topUpQuantity} onChange={(event) => { setTopUpQuantity(event.target.value); topUpOperation.setError(""); }} autoFocus required /><small className="muted">Dostępne po blokadach: {topUpAvailable.toLocaleString("pl-PL")} szt.</small></div><div className="button-row"><Submit>Wykonaj dokładkę i potwierdź PIN-em</Submit><button type="button" className="button" onClick={() => { setTopUpSelectedId(""); setTopUpQuantity(""); topUpOperation.setError(""); }}>Anuluj</button></div></form>}
    </div>;
  }

  return <><div className="tabs operation-tabs" role="tablist" aria-label="Tryb wydania amunicji"><button type="button" role="tab" aria-selected={tab === "new"} className={tab === "new" ? "active" : ""} onClick={() => { setTab("new"); topUpOperation.setError(""); }}><Plus aria-hidden />Nowe wydanie</button><button type="button" role="tab" aria-selected={tab === "top-up"} className={tab === "top-up" ? "active" : ""} onClick={() => { setTab("top-up"); operation.setError(""); }}><ShieldCheck aria-hidden />Dokładka{activeIssues.length > 0 && <span className="tab-count">{activeIssues.length}</span>}</button></div>{tab === "new" ? newIssueContent : topUpContent}{operation.dialog}{topUpOperation.dialog}</>;
}

export function ReturnAmmoForm({ issues }: { issues: ReturnAmmoIssueOption[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [returnedQuantity, setReturnedQuantity] = useState("");
  const [completed, setCompleted] = useState<{ registryRef: string; returned: number; consumed: number; consumptionAllocations: { bookSeries: string; bookName: string; quantity: number }[] } | null>(null);
  const operation = usePinMutation<{ issueId: string; returnedQuantity: number }>(async (payload, pin) => {
    const response = await requestJson("/api/operations/return-ammo", { ...payload, pin });
    const issue = issues.find((item) => item.id === payload.issueId)!;
    setCompleted({ registryRef: issue.registryRef, returned: response.returned, consumed: response.consumed, consumptionAllocations: response.consumptionAllocations });
    router.refresh();
  });
  const selected = issues.find((issue) => issue.id === selectedId) ?? null;
  const needle = query.toLocaleLowerCase("pl-PL");
  const filtered = issues.filter((issue) => !needle || [issue.registryRef, issue.recipientName, issue.recipientReference ?? "", issue.caliberSnapshot, issue.ammunitionType, ...issue.allocations.flatMap((allocation) => [allocation.book.series, allocation.book.name])].join(" ").toLocaleLowerCase("pl-PL").includes(needle));

  if (completed) return <SuccessNextActions title={`Rozliczono wydanie ${completed.registryRef}`} summary={`Zwrot: ${completed.returned.toLocaleString("pl-PL")} szt. • rozchód: ${completed.consumed.toLocaleString("pl-PL")} szt.`} details={completed.consumptionAllocations.length ? <p>Rozchód zapisano w: {completed.consumptionAllocations.map((allocation) => `${allocation.bookSeries} — ${allocation.bookName}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ")}.</p> : <p>Cała wydana amunicja wróciła; w ewidencji nie powstał rozchód.</p>}><button type="button" className="button primary" onClick={() => { setCompleted(null); setSelectedId(""); setReturnedQuantity(""); }}>Rozlicz kolejne wydanie</button><Link className="button" href="/registers/ammo-issues">Otwórz książkę wydań</Link><Link className="button" href="/ammunition">Zobacz stan amunicji</Link></SuccessNextActions>;
  if (!issues.length) return <InlineAlert tone="success">Brak aktywnych nierozliczonych wydań amunicji.</InlineAlert>;

  return <><div className="return-ammo-stack"><label className="return-ammo-search"><Search aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po pozycji, odbiorcy, kalibrze lub księdze…" aria-label="Szukaj nierozliczonego wydania amunicji" /></label><Messages error={operation.error} /><div className="ammo-return-list">{filtered.map((issue) => <article className={`ammo-return-item ${selectedId === issue.id ? "selected" : ""}`} key={issue.id}><header><div><span className="badge warn">Nierozliczone</span><h2>{issue.registryRef} — {issue.caliberSnapshot}</h2><p>{issue.ammunitionType} • wydano {formatDateTime(issue.issuedAt)}</p></div><strong>{issue.quantityIssued.toLocaleString("pl-PL")} szt.</strong></header><dl><div><dt>Odbiorca</dt><dd>{issue.recipientName}{issue.recipientReference ? ` • ${issue.recipientReference}` : ""}</dd></div><div><dt>Blokady</dt><dd>{issue.allocations.map((allocation) => `${allocation.book.series} — ${allocation.book.name}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ")}</dd></div>{issue.weapon && <div><dt>Powiązana broń</dt><dd><Link className="registry-link" href={`/weapons/${issue.weapon.id}`}>{issue.weapon.registryRef}</Link></dd></div>}</dl><footer><button type="button" className="button" onClick={() => { setSelectedId(issue.id); setReturnedQuantity(""); operation.setError(""); }}>Rozlicz ze zwrotem</button><button type="button" className="button danger-outline" onClick={() => operation.request({ issueId: issue.id, returnedQuantity: 0 })}><ShieldCheck aria-hidden />Rozlicz bez zwrotu</button></footer></article>)}</div>{!filtered.length && <div className="empty-inline">Brak wydań pasujących do wyszukiwania.</div>}{selected && <form className="confirm-card return-ammo-form" onSubmit={(event) => { event.preventDefault(); const returned = Number(returnedQuantity); if (!Number.isInteger(returned) || returned < 0 || returned > selected.quantityIssued) return operation.setError(`Wpisz liczbę od 0 do ${selected.quantityIssued}.`); operation.request({ issueId: selected.id, returnedQuantity: returned }); }}><div><h2>Rozliczenie {selected.registryRef}</h2><p>Wpisz liczbę niewykorzystanych sztuk zwracanych przez <strong>{selected.recipientName}</strong>. System zapisze rozchód jako różnicę.</p></div><div className="field"><label htmlFor="returnedQuantity">Ilość zwracana z {selected.quantityIssued.toLocaleString("pl-PL")} szt.</label><input className="input" id="returnedQuantity" type="number" min="0" max={selected.quantityIssued} value={returnedQuantity} onChange={(event) => { setReturnedQuantity(event.target.value); operation.setError(""); }} autoFocus required /></div><div className="button-row"><Submit>Rozlicz i potwierdź PIN-em</Submit><button type="button" className="button" onClick={() => { setSelectedId(""); setReturnedQuantity(""); operation.setError(""); }}>Anuluj</button></div></form>}</div>{operation.dialog}</>;
}

export function WithdrawWeaponForm({ weapons, documents }: { weapons: WeaponOption[]; documents: DocumentOption[] }) {
  const router = useRouter(); const [success, setSuccess] = useState(""); const operation = usePinMutation<Record<string, unknown>>(async (payload, pin) => { await requestJson("/api/operations/withdraw-weapon", { ...payload, pin }); setSuccess("Operację zapisano bez usuwania historii broni."); router.refresh(); });
  return <><form className="form-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); operation.request({ weaponId: data.get("weaponId"), documentId: data.get("documentId"), status: data.get("status"), basis: data.get("basis"), recipient: data.get("recipient") || undefined }); }}><Messages error={operation.error} success={success} /><div className="form-grid"><SelectField label="Egzemplarz" name="weaponId" options={weapons} full /><div className="field"><label htmlFor="withdraw-status">Rodzaj operacji</label><select className="select" id="withdraw-status" name="status"><option value="WITHDRAWN">Wycofanie</option><option value="TRANSFERRED">Przekazanie</option><option value="DEREGISTERED">Zdjęcie z ewidencji</option></select></div><div className="field full"><DocumentPicker documents={documents} /></div><TextField label="Podstawa i data" name="basis" required full /><TextField label="Jednostka / odbiorca" name="recipient" full /></div><Submit>Zapisz i potwierdź PIN-em</Submit></form>{operation.dialog}</>;
}

export function BookForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const complete = useCreateComplete();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError(""); try { await requestJson("/api/books", { type: data.get("type"), series: data.get("series"), name: data.get("name") }); form.reset(); complete(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać księgi."); } finally { setLoading(false); } }
  return <form className="form-stack" onSubmit={submit}><Messages error={error} /><div className="form-grid"><div className="field"><label htmlFor="book-type">Typ księgi</label><select className="select" id="book-type" name="type"><option value="WEAPON">Ewidencja broni</option><option value="AMMUNITION">Ewidencja amunicji</option><option value="WEAPON_ISSUE">Wydawanie broni</option><option value="AMMUNITION_ISSUE">Wydawanie amunicji</option></select></div><TextField label="Seria (A–ZZ)" name="series" required /><TextField label="Nazwa" name="name" required full /></div><Submit loading={loading}>Utwórz księgę</Submit></form>;
}

export function CaliberForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const complete = useCreateComplete();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError(""); try { await requestJson("/api/calibers", { canonicalName: data.get("canonicalName"), aliases: String(data.get("aliases") ?? "").split(",").map((value) => value.trim()).filter(Boolean) }); form.reset(); complete(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać kalibru."); } finally { setLoading(false); } }
  return <form className="form-stack" onSubmit={submit}><Messages error={error} /><TextField label="Nazwa kanoniczna" name="canonicalName" required /><TextField label="Aliasy rozdzielone przecinkami" name="aliases" /><Submit loading={loading}>Dodaj kaliber</Submit></form>;
}

export function UserForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const complete = useCreateComplete();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError(""); try { await requestJson("/api/users", { firstName: data.get("firstName"), lastName: data.get("lastName"), login: data.get("login"), temporaryPassword: data.get("temporaryPassword"), role: data.get("role"), isAuthorized: data.get("isAuthorized") === "on" }); form.reset(); complete(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się dodać użytkownika."); } finally { setLoading(false); } }
  return <form className="form-stack" onSubmit={submit}><Messages error={error} /><InlineAlert tone="info">Nowy użytkownik ustawi własny 4-cyfrowy PIN razem z hasłem przy pierwszym logowaniu.</InlineAlert><div className="form-grid"><TextField label="Imię" name="firstName" required /><TextField label="Nazwisko" name="lastName" required /><TextField label="Login" name="login" required /><TextField label="Hasło jednorazowe" name="temporaryPassword" type="password" required /><div className="field"><label htmlFor="role">Rola</label><select className="select" id="role" name="role"><option value="AUTHORIZED">Uprawniony</option><option value="ADMIN">Administrator</option></select></div><label className="field full checkbox-field"><input type="checkbox" name="isAuthorized" defaultChecked /> Osoba pisemnie upoważniona do wpisów</label></div><Submit loading={loading}>Dodaj użytkownika</Submit></form>;
}

export function BackupControls() {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [downloadUrl, setDownloadUrl] = useState(""); const router = useRouter();
  async function create() { setLoading(true); setError(""); try { const response = await requestJson("/api/backups", {}); setDownloadUrl(response.downloadUrl); setSuccess(`Kopia ${response.filename} przeszła walidację.`); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Błąd backupu."); } finally { setLoading(false); } }
  async function restore(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get("backup"); if (!(file instanceof File) || !file.size) return; setLoading(true); setError(""); try { if (data.get("confirmation") !== "ODTWÓRZ") throw new Error("Wpisz dokładnie ODTWÓRZ."); const response = await fetch("/api/backups", { method: "PUT", headers: { "x-confirm-restore": "ODTWÓRZ" }, body: file }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setSuccess("Dane zostały odtworzone i sprawdzone."); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Błąd odtwarzania."); } finally { setLoading(false); } }
  return <div className="form-stack"><Messages error={error} success={success} /><div className="button-row"><button className="button primary" onClick={create} disabled={loading}><FileArchive aria-hidden />Utwórz kopię teraz</button>{downloadUrl && <a className="button" href={downloadUrl}><Download aria-hidden />Pobierz kopię</a>}</div><form className="form-stack" onSubmit={restore}><h3>Odtwórz z kopii</h3><InlineAlert tone="info">Przed odtworzeniem system zapisze kopię aktualnego stanu i zweryfikuje sumy kontrolne oraz bazę SQLite.</InlineAlert><label className="upload-dropzone" htmlFor="backup-file"><span className="upload-icon"><Upload aria-hidden /></span><span><strong>Wybierz archiwum ZIP</strong><small>Pełna kopia bazy i plików lokalnych</small></span></label><input className="visually-hidden" id="backup-file" type="file" name="backup" accept="application/zip,.zip" required /><div className="field"><label htmlFor="restore-confirmation">Wpisz ODTWÓRZ, aby potwierdzić</label><input className="input" id="restore-confirmation" name="confirmation" autoComplete="off" pattern="ODTWÓRZ" required /></div><button className="button danger" disabled={loading}>Odtwórz dane z pliku</button></form></div>;
}

export function AuditVerifier() {
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  return <div className="form-stack"><Messages error={error} success={message} /><button className="button primary" style={{ width: "fit-content" }} onClick={async () => { setError(""); const response = await fetch("/api/audit/verify", { method: "POST" }); const body = await response.json(); if (!response.ok || !body.valid) setError(body.error ?? `Wykryto niespójność przy wpisie ${body.brokenAt}.`); else setMessage(`Zweryfikowano ${body.checked} wpisów. Łańcuch integralności jest prawidłowy.`); }}><CheckCircle2 aria-hidden />Sprawdź integralność</button></div>;
}

function TextField({ label, name, type = "text", required, full, defaultValue, placeholder, min }: { label: string; name: string; type?: string; required?: boolean; full?: boolean; defaultValue?: string; placeholder?: string; min?: number }) { return <div className={`field ${full ? "full" : ""}`}><label htmlFor={name}>{label}</label><input className="input" id={name} name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} min={type === "number" ? min ?? 0 : undefined} /></div>; }
function TextArea({ label, name }: { label: string; name: string }) { return <div className="field"><label htmlFor={name}>{label}</label><textarea className="textarea" id={name} name={name} /></div>; }
function SelectField({ label, name, options, full }: { label: string; name: string; options: WeaponOption[]; full?: boolean }) { return <div className={`field ${full ? "full" : ""}`}><label htmlFor={name}>{label}</label><select className="select" id={name} name={name} required><option value="">Wybierz…</option>{options.map((item) => <option value={item.id} key={item.id}>{item.registryRef} — {item.name}</option>)}</select></div>; }

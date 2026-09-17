"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Search, ShieldCheck, X } from "lucide-react";
import { PinConfirmDialog } from "@/components/pin-confirm-dialog";
import { InlineAlert } from "@/components/ui-system";
import { RecipientPicker, type RecipientValue } from "@/components/recipient-controls";
import { useWeaponGridSearch } from "@/components/use-weapon-grid-search";
import { WeaponGridCard, WeaponThumbnail, type WeaponVisual } from "@/components/weapon-ui";
import { planAmmoAllocation } from "@/lib/ammunition-allocation";

type Book = { id: string; type: string; series: string; name: string };
type AmmoIssue = { id: string; registryRef: string; quantityIssued: number; ammunitionType: string };
type Issue = { id: string; registryRef: string; recipientName: string; ammoIssues: AmmoIssue[] };
type Weapon = WeaponVisual & { brand: string; productionYear: number | null; accessories: string | null; notes: string | null; caliberId: string; magazineCount: number; book: Book; issues: Issue[] };
type Stock = { book: Book; available: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Nie udało się wykonać operacji.");
  return result;
}

function Steps({ active }: { active: number }) {
  return <div className="stepper" aria-label={`Krok ${active} z 4`}>{["Wybór broni", "Odbiorca", "Amunicja", "Podsumowanie"].map((label, index) => <div className={`step ${active === index + 1 ? "active" : active > index + 1 ? "done" : ""}`} key={label}><span>{active > index + 1 ? <Check aria-hidden /> : index + 1}</span>{label}</div>)}</div>;
}

function Row({ label, value }: { label: string; value: string | number }) { return <div className="detail-row"><dt>{label}</dt><dd>{value}</dd></div>; }

function Details({ weapon }: { weapon: Weapon | null }) {
  if (!weapon) return <InlineAlert tone="info">Wybierz egzemplarz, aby zobaczyć jego szczegóły.</InlineAlert>;
  return <><h2 className="dialog-weapon-ref">{weapon.registryRef}</h2><WeaponThumbnail weapon={weapon} sizes="300px" /><h3>{weapon.displayName || weapon.name}</h3><dl className="detail-list"><Row label="Kaliber" value={weapon.caliber.canonicalName} /><Row label="Seria / numer" value={`${weapon.weaponSeries ? `${weapon.weaponSeries} / ` : ""}${weapon.serialNumber}`} /><Row label="Rok produkcji" value={weapon.productionYear ?? "—"} /><Row label="Księga" value={`${weapon.book.series} — ${weapon.book.name}`} /><Row label="Status" value={weapon.status === "IN_STORAGE" ? "W magazynie" : "Niedostępna"} /><Row label="Wyposażenie" value={weapon.accessories || "—"} /><Row label="Magazynki" value={weapon.magazineCount} /></dl></>;
}

function WeaponGroup({ title, weapons, selectedId, allowUnavailable = false, onSelect }: { title?: string; weapons: Weapon[]; selectedId: string; allowUnavailable?: boolean; onSelect: (weapon: Weapon) => void }) {
  return <section className="weapon-grid-section">{title && <h2 className="weapon-section-title">{title} <span className="muted">({weapons.length})</span></h2>}<div className="weapon-grid">{weapons.map((weapon) => <WeaponGridCard key={weapon.id} weapon={weapon} selected={weapon.id === selectedId} allowUnavailable={allowUnavailable} onSelect={() => onSelect(weapon)} />)}</div></section>;
}

function WeaponGroups({ weapons, groupByType, selectedId, allowUnavailable, onSelect }: { weapons: Weapon[]; groupByType: boolean; selectedId: string; allowUnavailable?: boolean; onSelect: (weapon: Weapon) => void }) {
  if (!groupByType) return <WeaponGroup weapons={weapons} selectedId={selectedId} allowUnavailable={allowUnavailable} onSelect={onSelect} />;
  return <><WeaponGroup title="Broń krótka" weapons={weapons.filter((weapon) => weapon.type === "HANDGUN")} selectedId={selectedId} allowUnavailable={allowUnavailable} onSelect={onSelect} /><WeaponGroup title="Broń długa" weapons={weapons.filter((weapon) => weapon.type === "LONG_GUN")} selectedId={selectedId} allowUnavailable={allowUnavailable} onSelect={onSelect} /><WeaponGroup title="Inne" weapons={weapons.filter((weapon) => weapon.type === null)} selectedId={selectedId} allowUnavailable={allowUnavailable} onSelect={onSelect} /></>;
}

function ExactPosition({ position, clear }: { position: number | null; clear: () => void }) {
  return position === null ? null : <div className="exact-position-filter">Pozycja ewidencji: <strong>{position}</strong><button type="button" onClick={clear} aria-label="Wyłącz dokładny filtr pozycji"><X aria-hidden /></button></div>;
}

function MagazineStepper({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  return <div className="field"><label htmlFor="magazines">Liczba wydawanych magazynków</label><div className="number-stepper"><button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label="Zmniejsz liczbę magazynków"><Minus aria-hidden /></button><input className="input" id="magazines" type="number" min="0" max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(0, Number(event.target.value) || 0)))} /><button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Zwiększ liczbę magazynków"><Plus aria-hidden /></button></div><small className="muted">Dostępne z tym egzemplarzem: {max}.</small></div>;
}

const emptyRecipient: RecipientValue = { recipientId: null, name: "", reference: "" };

export function IssueWeaponDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [weapons, setWeapons] = useState<Weapon[]>([]); const [books, setBooks] = useState<Book[]>([]); const [stocks, setStocks] = useState<Stock[]>([]);
  const [groupByType, setGroupByType] = useState(true); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [pinOpen, setPinOpen] = useState(false);
  const [step, setStep] = useState(1); const [selectedId, setSelectedId] = useState(""); const [recipient, setRecipient] = useState<RecipientValue>(emptyRecipient); const [magazineCount, setMagazineCount] = useState(0);
  const [skipAmmo, setSkipAmmo] = useState(true); const [sourceBookId, setSourceBookId] = useState(""); const [ammoQuantity, setAmmoQuantity] = useState(""); const [ammunitionType, setAmmunitionType] = useState("pełnopłaszczowa");
  const searchRef = useRef<HTMLInputElement>(null); const selected = weapons.find((weapon) => weapon.id === selectedId) ?? null;
  const search = useWeaponGridSearch(weapons, (weapon) => [weapon.registryRef, weapon.book.series, weapon.name, weapon.displayName, weapon.brand, weapon.caliber.canonicalName, weapon.weaponSeries, weapon.serialNumber]);

  useEffect(() => {
    if (!open) return;
    void Promise.all([api<{ weapons: Weapon[]; settings: { groupWeaponsByType: boolean } }>("/api/weapons"), api<{ books: Book[] }>("/api/books")]).then(([weaponData, bookData]) => { setWeapons(weaponData.weapons); setGroupByType(weaponData.settings.groupWeaponsByType); setBooks(bookData.books); setTimeout(() => searchRef.current?.focus(), 0); }).catch((reason) => setError(reason.message));
  }, [open]);
  useEffect(() => {
    if (step !== 3 || !selected) return;
    const reset = window.setTimeout(() => { setSkipAmmo(true); setSourceBookId(""); setAmmoQuantity(""); }, 0);
    void api<{ stocks: Stock[] }>(`/api/ammunition/stock?caliberId=${selected.caliberId}`).then((data) => setStocks(data.stocks)).catch((reason) => setError(reason.message));
    return () => window.clearTimeout(reset);
  }, [step, selected]);
  useEffect(() => { if (!open) return; const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !pinOpen) onClose(); }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [open, onClose, pinOpen]);

  const issueBook = books.find((book) => book.type === "WEAPON_ISSUE"); const ammoIssueBook = books.find((book) => book.type === "AMMUNITION_ISSUE");
  const totalAvailable = stocks.reduce((sum, stock) => sum + stock.available, 0); const available = stocks.find((stock) => stock.book.id === sourceBookId)?.available ?? totalAvailable;
  const ammoPlan = planAmmoAllocation(stocks.map((stock) => ({ bookId: stock.book.id, available: stock.available })), Number(ammoQuantity), sourceBookId || undefined);
  const canNext = step === 2 ? recipient.name.trim().length >= 2 : step === 3 ? skipAmmo || Boolean(Number(ammoQuantity) > 0 && Number(ammoQuantity) <= available && ammunitionType.trim().length >= 2 && ammoIssueBook) : true;

  function selectWeapon(weapon: Weapon) { setSelectedId(weapon.id); setMagazineCount(weapon.magazineCount > 0 ? 1 : 0); setStep(2); }
  async function confirm(pin: string) {
    if (!selected || !issueBook) throw new Error("Brak aktywnej księgi wydawania broni."); setLoading(true); setError("");
    try {
      const result = await api<{ issue: { registryRef: string } }>("/api/operations/issue-weapon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weaponId: selected.id, bookId: issueBook.id, recipientId: recipient.recipientId || undefined, recipientName: recipient.name, recipientReference: recipient.reference || undefined, magazineCount, pin, ammo: !skipAmmo && ammoIssueBook ? { issueBookId: ammoIssueBook.id, sourceBookId: sourceBookId || undefined, quantity: Number(ammoQuantity), ammunitionType } : undefined }) });
      setSuccess(`Wydanie zapisano jako ${result.issue.registryRef}.`); setWeapons((items) => items.map((item) => item.id === selected.id ? { ...item, status: "ISSUED" } : item)); router.refresh();
    } finally { setLoading(false); }
  }

  if (!open) return null;
  return <><div className="dialog-backdrop" role="presentation"><section className="dialog issue-dialog" role="dialog" aria-modal="true" aria-labelledby="issue-title"><header className="dialog-header"><div><h1 className="dialog-title" id="issue-title">Wydanie broni</h1><span className="muted small">Wybierz egzemplarz i przeprowadź wydanie w jednej transakcji.</span></div><button className="close-button" onClick={onClose} aria-label="Zamknij"><X /></button></header><div className="dialog-body"><div className="dialog-content">{error && <InlineAlert tone="error">{error}</InlineAlert>}{success ? <div className="confirm-card"><InlineAlert tone="success">{success}</InlineAlert><p>Stan broni i wszystkie rejestry zostały odświeżone. Wydana amunicja została zablokowana do czasu rozliczenia.</p></div> : step === 1 ? <><div className="search-hero"><Search aria-hidden /><div><input ref={searchRef} value={search.query} onChange={(event) => search.setQuery(event.target.value)} onKeyDown={search.onKeyDown} placeholder="Wyszukaj broń…" aria-label="Wyszukaj broń" /><small>Pozycja, nazwa, marka, kaliber, księga, seria lub numer broni</small></div></div><ExactPosition position={search.exactPosition} clear={search.clearExact} /><WeaponGroups weapons={search.filtered} groupByType={groupByType} selectedId={selectedId} onSelect={selectWeapon} /></> : step === 2 ? <div className="confirm-card"><h2>Odbiorca</h2><RecipientPicker value={recipient} onChange={setRecipient} autoFocus />{selected && selected.magazineCount > 0 && <MagazineStepper value={magazineCount} max={selected.magazineCount} onChange={setMagazineCount} />}</div> : step === 3 ? <div className="confirm-card"><h2><strong>Amunicja {selected?.caliber.canonicalName}</strong></h2>{stocks.length ? <div className="form-stack"><label className="checkbox-field"><input type="checkbox" checked={skipAmmo} onChange={(event) => setSkipAmmo(event.target.checked)} /> Pomiń wydanie amunicji</label>{!skipAmmo && <><div className="field"><label htmlFor="stockBook">Księga źródłowa (opcjonalnie)</label><select className="select" id="stockBook" value={sourceBookId} onChange={(event) => setSourceBookId(event.target.value)}><option value="">Dobierz automatycznie — łącznie {totalAvailable.toLocaleString("pl-PL")} szt.</option>{stocks.map((stock) => <option value={stock.book.id} key={stock.book.id}>{stock.book.series} — {stock.book.name} ({stock.available.toLocaleString("pl-PL")} szt. dostępnych)</option>)}</select></div><div className="field"><label htmlFor="ammoType">Typ amunicji</label><input className="input" id="ammoType" value={ammunitionType} onChange={(event) => setAmmunitionType(event.target.value)} /></div><div className="field"><label htmlFor="ammoQuantity">Ilość</label><input className="input" id="ammoQuantity" type="number" min="1" max={available} value={ammoQuantity} onChange={(event) => setAmmoQuantity(event.target.value)} autoFocus /><small className="muted">Dostępne po blokadach: {available.toLocaleString("pl-PL")} szt.</small></div>{Number(ammoQuantity) > 0 && <InlineAlert tone={ammoPlan.complete ? "info" : "warning"}>{ammoPlan.complete ? <>Planowana blokada: {ammoPlan.allocations.map((allocation) => { const stock = stocks.find((item) => item.book.id === allocation.bookId); return `${stock?.book.series} — ${stock?.book.name}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`; }).join("; ")}</> : <>Brakuje {(Number(ammoQuantity) - ammoPlan.available).toLocaleString("pl-PL")} szt.</>}</InlineAlert>}</>}</div> : <InlineAlert tone="info">Brak dostępnej amunicji w kalibrze tej broni. Możesz wydać samą broń.</InlineAlert>}</div> : <div className="confirm-card"><h2>Podsumowanie operacji</h2><dl className="detail-list"><Row label="Broń" value={`${selected?.registryRef} — ${selected?.displayName || selected?.name}`} /><Row label="Odbiorca" value={recipient.name} />{selected && selected.magazineCount > 0 && <Row label="Magazynki" value={magazineCount} />}<Row label="Amunicja" value={skipAmmo ? "Pominięto" : `${ammoQuantity} × ${selected?.caliber.canonicalName}`} /><Row label="Źródło" value={skipAmmo ? "—" : sourceBookId ? `${stocks.find((stock) => stock.book.id === sourceBookId)?.book.series} — ${stocks.find((stock) => stock.book.id === sourceBookId)?.book.name}` : "Dobór automatyczny"} /></dl><InlineAlert tone="info">Kliknij „Zapisz wydanie”, a następnie wpisz PIN w oknie potwierdzenia.</InlineAlert></div>}</div><aside className="dialog-aside"><Steps active={step} /><Details weapon={selected} /></aside></div><footer className="dialog-footer"><button className="button" onClick={step === 1 ? onClose : () => setStep((value) => value - 1)}><ArrowLeft aria-hidden />{step === 1 ? "Anuluj" : "Wstecz"}</button>{success ? <button className="button primary" onClick={() => { onClose(); router.refresh(); }}>Zamknij</button> : step < 4 ? <button className="button primary" disabled={!canNext} onClick={() => setStep((value) => value + 1)}>Dalej <ArrowRight aria-hidden /></button> : <button className="button primary" disabled={loading} onClick={() => setPinOpen(true)}><ShieldCheck aria-hidden />Zapisz wydanie</button>}</footer></section></div><PinConfirmDialog open={pinOpen} title="Potwierdź wydanie broni" onClose={() => setPinOpen(false)} onConfirm={confirm} /></>;
}

export function ReturnWeaponDialog({ open, operatorName, onClose }: { open: boolean; operatorName: string; onClose: () => void }) {
  const router = useRouter(); const [weapons, setWeapons] = useState<Weapon[]>([]); const [groupByType, setGroupByType] = useState(true); const [selectedId, setSelectedId] = useState(""); const [returnedAmmo, setReturnedAmmo] = useState("0"); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [pinOpen, setPinOpen] = useState(false);
  const search = useWeaponGridSearch(weapons, (weapon) => [weapon.registryRef, weapon.name, weapon.displayName, weapon.weaponSeries, weapon.serialNumber, weapon.caliber.canonicalName]);
  useEffect(() => { if (open) void api<{ weapons: Weapon[]; settings: { groupWeaponsByType: boolean } }>("/api/weapons?issued=true").then((data) => { setWeapons(data.weapons); setGroupByType(data.settings.groupWeaponsByType); }).catch((reason) => setError(reason.message)); }, [open]);
  if (!open) return null;
  const selected = weapons.find((weapon) => weapon.id === selectedId) ?? null; const issue = selected?.issues[0]; const linkedAmmo = issue?.ammoIssues[0];
  async function confirm(pin: string) { if (!issue) throw new Error("Wybierz wydaną broń."); await api("/api/operations/return-weapon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueId: issue.id, returnedFromName: issue.recipientName, returnedAmmoQuantity: Number(returnedAmmo), pin }) }); setSuccess(`Przyjęto zwrot broni ${selected!.registryRef}. Rozchód amunicji: ${linkedAmmo ? linkedAmmo.quantityIssued - Number(returnedAmmo) : 0} szt.`); router.refresh(); }
  return <><div className="dialog-backdrop"><section className="dialog return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title"><header className="dialog-header"><div><h1 className="dialog-title" id="return-title">Zwrot broni</h1><span className="muted small">Lista zawiera wyłącznie aktualnie wydane egzemplarze.</span></div><button className="close-button" onClick={onClose} aria-label="Zamknij"><X /></button></header><div className="dialog-body"><div className="dialog-content">{error && <InlineAlert tone="error">{error}</InlineAlert>}{success ? <div className="confirm-card"><InlineAlert tone="success">{success}</InlineAlert></div> : <><div className="search-hero"><Search aria-hidden /><input value={search.query} onChange={(event) => search.setQuery(event.target.value)} onKeyDown={search.onKeyDown} placeholder="Wyszukaj wydaną broń…" autoFocus /></div><ExactPosition position={search.exactPosition} clear={search.clearExact} /><WeaponGroups weapons={search.filtered} groupByType={groupByType} selectedId={selectedId} allowUnavailable onSelect={(weapon) => { setSelectedId(weapon.id); setReturnedAmmo("0"); }} />{selected && <div className="confirm-card"><h2>Przyjęcie {selected.registryRef}</h2><p>Zwracający: <strong>{issue?.recipientName}</strong></p><p>Przyjmujący: <strong>{operatorName}</strong></p>{linkedAmmo && <div className="field"><label htmlFor="returnedAmmo">Niewykorzystana amunicja zwracana z {linkedAmmo.quantityIssued} szt.</label><input className="input" id="returnedAmmo" type="number" min="0" max={linkedAmmo.quantityIssued} value={returnedAmmo} onChange={(event) => setReturnedAmmo(event.target.value)} /></div>}</div>}</>}</div><aside className="dialog-aside"><Details weapon={selected} />{linkedAmmo && <InlineAlert tone="info">Z bronią wydano {linkedAmmo.quantityIssued} szt. {linkedAmmo.ammunitionType}. System obliczy rozchód automatycznie.</InlineAlert>}</aside></div><footer className="dialog-footer"><button className="button" onClick={onClose}><ArrowLeft aria-hidden />Anuluj</button>{success ? <button className="button primary" onClick={() => { onClose(); router.refresh(); }}>Zamknij</button> : <button className="button primary" onClick={() => setPinOpen(true)} disabled={!issue}><ShieldCheck aria-hidden />Przyjmij zwrot</button>}</footer></section></div><PinConfirmDialog open={pinOpen} title="Potwierdź przyjęcie broni" onClose={() => setPinOpen(false)} onConfirm={confirm} /></>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatDateTime } from "@/lib/utils";
import { WeaponHistoryControls } from "@/components/history-controls";
import { WeaponMetadataControls } from "@/components/weapon-detail-controls";
import { WeaponThumbnail } from "@/components/weapon-ui";
import { documentTypeLabels, labelFor, weaponEventTypeLabels } from "@/lib/labels";

export const metadata = { title: "Karta broni" };
const PAGE_SIZE = 10;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ historyPage?: string }> }) {
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).historyPage) || 1);
  const [weapon, issueCount, issues] = await Promise.all([
    prisma.weapon.findUnique({
      where: { id },
      include: {
        caliber: true,
        book: true,
        acquisitionDocument: true,
        images: { orderBy: { createdAt: "asc" } },
        events: { include: { document: true }, orderBy: { effectiveAt: "desc" }, take: 50 },
        verificationFlags: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.weaponIssue.count({ where: { weaponId: id } }),
    prisma.weaponIssue.findMany({
      where: { weaponId: id }, include: { ammoIssues: true }, orderBy: { issuedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
  ]);
  if (!weapon) notFound();
  const pages = Math.max(1, Math.ceil(issueCount / PAGE_SIZE));

  return <div className="page">
    <PageHeader eyebrow="Karta broni" title={`${weapon.registryRef} — ${weapon.displayName || weapon.name}`} description={`${weapon.brand} • ${weapon.caliber.canonicalName} • numer ${weapon.serialNumber}`} actions={<Link className="button" href="/weapons"><ArrowLeft aria-hidden />Broń w bazie</Link>} />
    <section className="weapon-hero-card">
      <div className="weapon-hero-image"><WeaponThumbnail weapon={weapon} sizes="(max-width: 760px) 100vw, 420px" priority /></div>
      <div>
        <div className="weapon-hero-status"><span className={`badge ${weapon.status === "IN_STORAGE" ? "ok" : weapon.status === "ISSUED" ? "warn" : "bad"}`}>{weapon.status === "IN_STORAGE" ? "W magazynie" : weapon.status === "ISSUED" ? "Wydana" : "Poza stanem"}</span><span>{weapon.type === "HANDGUN" ? "Broń krótka" : weapon.type === "LONG_GUN" ? "Broń długa" : "Inne"}</span></div>
        <h2>{weapon.displayName || weapon.name}</h2><p>Nazwa ewidencyjna: {weapon.name}</p>
        <div className="weapon-quick-facts"><span><strong>{weapon.caliber.canonicalName}</strong>Kaliber</span><span><strong>{weapon.book.series}/{weapon.positionNo}</strong>Księga / pozycja</span><span><strong>{weapon.productionYear ?? "—"}</strong>Rok produkcji</span><span><strong>{weapon.magazineCount}</strong>Magazynki</span></div>
      </div>
    </section>
    <div className="detail-columns">
      <section className="page-card"><h2 className="section-heading"><FileText aria-hidden />Dane ewidencyjne</h2><dl className="detail-list">
        <Row label="Marka" value={weapon.brand} /><Row label="Seria i numer" value={`${weapon.weaponSeries ? `${weapon.weaponSeries} / ` : ""}${weapon.serialNumber}`} /><Row label="Cechy identyfikacyjne" value={weapon.otherIdentifyingMarks || "—"} /><Row label="Wyposażenie" value={weapon.accessories || "—"} /><Row label="Ilość magazynków" value={weapon.magazineCount} /><Row label="Podstawa nabycia" value={weapon.acquisitionBasis} /><Row label="Data nabycia" value={formatDate(weapon.acquisitionDate)} /><Row label="Zewidencjonowano" value={formatDateTime(weapon.registeredAt)} /><Row label="Świadectwo broni" value={weapon.certificateNumber || "—"} /><Row label="Uwagi" value={weapon.notes || "—"} />
        <div className="detail-row"><dt>Dokument nabycia</dt><dd><Link className="document-link" href={`/documents/${weapon.acquisitionDocument.id}`}>{labelFor(documentTypeLabels, weapon.acquisitionDocument.type, "Inny dokument")} {weapon.acquisitionDocument.number || weapon.acquisitionDocument.description}</Link></dd></div>
      </dl></section>
      <section className="page-card"><h2 className="section-heading">Metadane i zdjęcia</h2><WeaponMetadataControls weaponId={weapon.id} displayName={weapon.displayName} magazineCount={weapon.magazineCount} images={weapon.images} /></section>
    </div>
    <section className="page-card"><h2 className="section-heading"><CalendarDays aria-hidden />Historia wydań</h2><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Wydanie</th><th>Odbiorca</th><th>Wydający</th><th>Zwrot</th><th>Przyjmujący / zdający</th><th>Amunicja</th><th>Status</th></tr></thead><tbody>
      {issues.map((issue) => <tr key={issue.id}><td><strong>{issue.registryRef}</strong><br />{formatDateTime(issue.issuedAt)}</td><td>{issue.recipientName}</td><td>{issue.issuedByName}</td><td>{formatDateTime(issue.returnedAt)}</td><td>{issue.returnedByName || "—"} / {issue.returnedFromName || "—"}</td><td>{issue.ammoIssues.length ? issue.ammoIssues.map((ammo) => `${ammo.quantityIssued} szt. ${ammo.caliberSnapshot}`).join(", ") : "—"}</td><td><span className={`badge ${issue.status === "ACTIVE" ? "warn" : "ok"}`}>{issue.status === "ACTIVE" ? "Wydana" : "Zamknięta"}</span></td></tr>)}
      {!issues.length && <tr><td colSpan={7} className="muted">Brak wydań tej broni.</td></tr>}
    </tbody></table></div>{pages > 1 && <nav className="pagination" aria-label="Strony historii wydań">{Array.from({ length: pages }, (_, index) => index + 1).map((number) => <Link className={number === page ? "active" : ""} href={`?historyPage=${number}`} key={number}>{number}</Link>)}</nav>}</section>
    <section className="page-card"><h2 className="section-heading"><ShieldCheck aria-hidden />Chronologia ewidencyjna</h2><div className="timeline">{weapon.events.map((event) => <article key={event.id}><time>{formatDateTime(event.effectiveAt)}</time><div><strong>{labelFor(weaponEventTypeLabels, event.type, "Inne zdarzenie")}</strong><p>{event.basis || "Zdarzenie systemowe"}</p>{event.document && <Link className="document-link" href={`/documents/${event.document.id}`}>{labelFor(documentTypeLabels, event.document.type, "Inny dokument")} {event.document.number || event.document.description}</Link>}<small>{event.performedByName}</small></div></article>)}</div></section>
    <section className="page-card no-print"><WeaponHistoryControls weaponId={weapon.id} openFlags={weapon.verificationFlags.filter((flag) => !flag.resolvedAt)} /></section>
  </div>;
}

function Row({ label, value }: { label: string; value: string | number }) { return <div className="detail-row"><dt>{label}</dt><dd>{value}</dd></div>; }

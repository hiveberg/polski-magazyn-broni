import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { IssueAmmoForm } from "@/components/entity-forms";
import { ammoStockKey, getAmmoStockBalances } from "@/lib/ammunition-stock";

export const metadata = { title: "Wydaj amunicję" };
export default async function Page() {
  const [ammoBooks, issueBooks, calibers, activeIssues, stockRows] = await Promise.all([
    prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, select: { id: true, series: true, name: true }, orderBy: { series: "asc" } }),
    prisma.registerBook.findMany({ where: { type: "AMMUNITION_ISSUE", status: "ACTIVE" }, select: { id: true, series: true, name: true }, orderBy: { series: "asc" } }),
    prisma.caliber.findMany({ where: { active: true }, include: { aliases: true, _count: { select: { weapons: true, ammoEntries: true, ammoIssues: true } } }, orderBy: { canonicalName: "asc" } }),
    prisma.ammoIssue.findMany({ where: { status: "ACTIVE" }, include: { allocations: { include: { book: { select: { series: true, name: true } } }, orderBy: { sequence: "asc" } }, weaponIssue: { include: { weapon: { select: { id: true, registryRef: true } } } } }, orderBy: [{ issuedAt: "asc" }, { positionNo: "asc" }] }),
    getAmmoStockBalances(prisma),
  ]);
  const activeBookIds = new Set(ammoBooks.map((book) => book.id));
  const caliberOptions = calibers.flatMap((caliber) => {
    const books = ammoBooks.map((book) => ({ ...book, available: activeBookIds.has(book.id) ? stockRows.get(ammoStockKey(book.id, caliber.id))?.available ?? 0 : 0 })).filter((book) => book.available > 0);
    const totalAvailable = books.reduce((sum, book) => sum + book.available, 0);
    return totalAvailable > 0 ? [{ id: caliber.id, canonicalName: caliber.canonicalName, aliases: caliber.aliases, usageCount: caliber._count.weapons + caliber._count.ammoEntries + caliber._count.ammoIssues, totalAvailable, books }] : [];
  });
  const activeIssueOptions = activeIssues.map((issue) => ({ id: issue.id, registryRef: issue.registryRef, recipientName: issue.recipientName, recipientReference: issue.recipientReference, quantityIssued: issue.quantityIssued, caliberSnapshot: issue.caliberSnapshot, caliberId: issue.caliberId, ammunitionType: issue.ammunitionType, issuedAt: issue.issuedAt.toISOString(), allocations: issue.allocations, weapon: issue.weaponIssue?.weapon ?? null }));
  return <div className="page"><PageHeader eyebrow="Operacje" title="Wydaj amunicję" description="Utwórz nowe wydanie albo rozlicz aktywne wydanie bez zwrotu i wykonaj dokładkę." /><section className="page-card"><IssueAmmoForm issueBooks={issueBooks} calibers={caliberOptions} activeIssues={activeIssueOptions} /></section></div>;
}

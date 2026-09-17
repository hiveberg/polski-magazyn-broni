"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, ArrowDownToLine, ArrowUpFromLine, BookOpen, Boxes, FilePenLine, FilePlus2, Files, Gauge, History, PackageCheck, Printer, Settings, ShieldCheck, UserRoundCheck, Users, Warehouse } from "lucide-react";

const sections = [
  { title: "PULPIT", items: [["Pulpit", "/dashboard", Gauge], ["Broń w bazie", "/weapons", Warehouse], ["Stan amunicji", "/ammunition", Boxes]] },
  { title: "REJESTRY", items: [["Ewidencja broni", "/registers/weapons", Archive], ["Ewidencja amunicji", "/registers/ammunition", Boxes], ["Książka wydawania broni", "/registers/weapon-issues", History], ["Książka wydawania amunicji", "/registers/ammo-issues", BookOpen]] },
  { title: "OPERACJE", items: [["Wydanie broni", "/dashboard?action=issue-weapon", ArrowUpFromLine], ["Zwrot broni", "/dashboard?action=return-weapon", ArrowDownToLine], ["Wydanie amunicji", "/operations/issue-ammunition", ArrowUpFromLine], ["Zwrot amunicji", "/operations/return-ammunition", ArrowDownToLine], ["Dodaj broń", "/operations/add-weapon", FilePlus2], ["Dodaj amunicję", "/operations/add-ammunition", FilePlus2], ["Wycofanie broni", "/operations/withdraw-weapon", Archive]] },
  { title: "DOKUMENTY / RAPORTY", items: [["Dokumenty", "/documents", Files], ["Korekty", "/corrections", FilePenLine], ["Raport kontroli", "/inspection", ShieldCheck], ["Wydruki", "/prints", Printer]] },
  { title: "ADMINISTRACJA", items: [["Użytkownicy", "/administration/users", Users], ["Lista odbiorców", "/administration/recipients", UserRoundCheck], ["Książki", "/administration/books", BookOpen], ["Słownik kalibrów", "/administration/calibers", Boxes], ["Audyt", "/administration/audit", ShieldCheck], ["Kopie zapasowe", "/administration/backups", PackageCheck], ["Ustawienia", "/administration/settings", Settings]] },
] as const;

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  function active(href: string) {
    const target = new URL(href, "http://pmbp.local");
    const action = target.searchParams.get("action");
    if (action) return pathname === target.pathname && params.get("action") === action;
    if (target.pathname === "/dashboard") return pathname === "/dashboard" && !params.get("action");
    return pathname === target.pathname || pathname.startsWith(`${target.pathname}/`);
  }
  return <nav aria-label="Główna nawigacja">{sections.filter((section) => section.title !== "ADMINISTRACJA" || isAdmin).map((section) => <div className="nav-section" key={section.title}><div className="nav-title">{section.title}</div>{section.items.map(([label, href, Icon]) => <Link className={`nav-link ${active(href) ? "active" : ""}`} href={href} key={href} title={label} aria-current={active(href) ? "page" : undefined}><Icon aria-hidden /><span>{label}</span></Link>)}</div>)}</nav>;
}

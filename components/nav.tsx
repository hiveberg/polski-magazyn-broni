"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ArrowDownToLine, ArrowUpFromLine, BookOpen, Boxes, FilePlus2, Files, Gauge, History, PackageCheck, Printer, Settings, ShieldCheck, Users, Warehouse } from "lucide-react";

const sections = [
  { title: "PULPIT", items: [["Pulpit", "/dashboard", Gauge], ["Broń w bazie", "/weapons", Warehouse], ["Stan amunicji", "/ammunition", Boxes]] },
  { title: "REJESTRY", items: [["Ewidencja broni", "/registers/weapons", Archive], ["Ewidencja amunicji", "/registers/ammunition", Boxes], ["Książka wydawania broni", "/registers/weapon-issues", History], ["Książka wydawania amunicji", "/registers/ammo-issues", BookOpen]] },
  { title: "OPERACJE", items: [["Wydanie broni", "/dashboard?action=issue-weapon", ArrowUpFromLine], ["Zwrot broni", "/dashboard?action=return-weapon", ArrowDownToLine], ["Wydanie amunicji", "/operations/issue-ammunition", ArrowUpFromLine], ["Zwrot amunicji", "/operations/return-ammunition", ArrowDownToLine], ["Dodaj broń", "/operations/add-weapon", FilePlus2], ["Dodaj amunicję", "/operations/add-ammunition", FilePlus2], ["Wycofanie broni", "/operations/withdraw-weapon", Archive]] },
  { title: "DOKUMENTY / RAPORTY", items: [["Dokumenty", "/documents", Files], ["Raport kontroli", "/inspection", ShieldCheck], ["Wydruki", "/prints", Printer]] },
  { title: "ADMINISTRACJA", items: [["Użytkownicy", "/administration/users", Users], ["Książki", "/administration/books", BookOpen], ["Słownik kalibrów", "/administration/calibers", Boxes], ["Audyt", "/administration/audit", ShieldCheck], ["Kopie zapasowe", "/administration/backups", PackageCheck], ["Ustawienia", "/administration/settings", Settings]] },
] as const;

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return <>{sections.filter((section) => section.title !== "ADMINISTRACJA" || isAdmin).map((section) => <div className="nav-section" key={section.title}><div className="nav-title">{section.title}</div>{section.items.map(([label, href, Icon]) => <Link className={`nav-link ${pathname === href.split("?")[0] ? "active" : ""}`} href={href} key={href}><Icon /><span>{label}</span></Link>)}</div>)}</>;
}

import { Search } from "lucide-react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth/session";
import { PRODUCT_FULL_NAME } from "@/lib/brand";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";
import { ProductWordmark } from "@/components/product-branding";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/" aria-label={`${PRODUCT_FULL_NAME} — przejdź do pulpitu`}><ProductWordmark className="brand-mark" /><div className="brand-copy"><strong>POLSKI MAGAZYN</strong><span>BRONI PALNEJ</span><small>Ewidencja. Kontrola.<br />Bezpieczeństwo.</small></div></Link><Nav isAdmin={user.role === "ADMIN"} /></aside><main className="main"><header className="topbar"><div className="top-search"><Search size={18} /><span>Szukaj w systemie…</span></div><div className="user-chip"><div className="avatar">{initials}</div><div><strong>{user.firstName} {user.lastName}</strong><br /><span>{user.role === "ADMIN" ? "Administrator" : "Uprawniony"}</span></div><LogoutButton /></div></header>{children}</main></div>;
}

import { Search } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">PMB</div><span>POLSKI MAGAZYN<br />BRONI</span></div><Nav isAdmin={user.role === "ADMIN"} /></aside><main className="main"><header className="topbar"><div className="top-search"><Search size={18} /><span>Szukaj w systemie…</span></div><div className="user-chip"><div className="avatar">{initials}</div><div><strong>{user.firstName} {user.lastName}</strong><br /><span>{user.role === "ADMIN" ? "Administrator" : "Uprawniony"}</span></div><LogoutButton /></div></header>{children}</main></div>;
}

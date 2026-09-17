import Link from "next/link";
import { Suspense } from "react";
import type { CurrentUser } from "@/lib/auth/session";
import { PRODUCT_FULL_NAME } from "@/lib/brand";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";
import { ProductWordmark } from "@/components/product-branding";
import { AppFrame } from "@/components/app-frame";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const sidebar = <><Link className="brand" href="/" aria-label={`${PRODUCT_FULL_NAME} — przejdź do pulpitu`}><ProductWordmark className="brand-mark" /><div className="brand-copy"><strong>POLSKI MAGAZYN</strong><span>BRONI PALNEJ</span><small>Ewidencja. Kontrola.<br />Bezpieczeństwo.</small></div></Link><Suspense fallback={null}><Nav isAdmin={user.role === "ADMIN"} /></Suspense></>;
  const userChip = <div className="user-chip"><div className="avatar">{initials}</div><div><strong>{user.firstName} {user.lastName}</strong><br /><span>{user.role === "ADMIN" ? "Administrator" : "Uprawniony"}</span></div><LogoutButton /></div>;
  return <AppFrame sidebar={sidebar} user={userChip}>{children}</AppFrame>;
}

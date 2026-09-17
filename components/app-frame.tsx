"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";

const STORAGE_KEY = "pmbp:sidebar-collapsed";

export function AppFrame({ sidebar, user, children }: { sidebar: ReactNode; user: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { const timer = window.setTimeout(() => setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true"), 0); return () => window.clearTimeout(timer); }, []);
  function toggleCollapsed() {
    setCollapsed((current) => { const next = !current; window.localStorage.setItem(STORAGE_KEY, String(next)); return next; });
  }

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-nav-open" : ""}`}>
    <aside className="sidebar" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }}>
      <button type="button" className="sidebar-collapse-button" onClick={toggleCollapsed} aria-label={collapsed ? "Rozwiń nawigację" : "Zwiń nawigację"} aria-expanded={!collapsed} title={collapsed ? "Rozwiń nawigację" : "Zwiń nawigację"}>{collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}</button>
      <button type="button" className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Zamknij nawigację"><X aria-hidden /></button>
      {sidebar}
    </aside>
    {mobileOpen && <button type="button" className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} aria-label="Zamknij nawigację" />}
    <main className="main"><header className="topbar"><button type="button" className="mobile-nav-button" onClick={() => setMobileOpen(true)} aria-label="Otwórz nawigację" aria-expanded={mobileOpen}><Menu aria-hidden /></button><div className="top-search"><Search size={18} /><span>Szukaj w systemie…</span></div>{user}</header><div id="main-content">{children}</div>
    </main>
  </div>;
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, FilePlus2, Printer } from "lucide-react";
import { IssueWeaponDialog, ReturnWeaponDialog } from "@/components/weapon-dialogs";

export function OperationLauncher({ operatorName }: { operatorName: string }) {
  const params = useSearchParams(); const router = useRouter(); const [dialog, setDialog] = useState<"issue" | "return" | null>(params.get("action") === "issue-weapon" ? "issue" : params.get("action") === "return-weapon" ? "return" : null);
  const close = useCallback(() => { setDialog(null); router.replace("/dashboard", { scroll: false }); }, [router]);
  useEffect(() => {
    if (!document.modelContext?.registerTool) return; const lifecycle = new AbortController();
    void Promise.resolve(document.modelContext.registerTool({ name: "start_weapon_issue", title: "Rozpocznij wydanie broni", description: "Otwiera bezpieczny formularz wydania broni. Nie zapisuje operacji bez ręcznego potwierdzenia PIN-em.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => { setDialog("issue"); return { opened: true }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    void Promise.resolve(document.modelContext.registerTool({ name: "start_weapon_return", title: "Rozpocznij zwrot broni", description: "Otwiera formularz zwrotu aktualnie wydanej broni. Nie zapisuje operacji bez ręcznego potwierdzenia PIN-em.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => { setDialog("return"); return { opened: true }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  return <><div className="actions"><button className="action primary" onClick={() => setDialog("issue")}><ArrowUpFromLine />Wydaj broń</button><button className="action" onClick={() => setDialog("return")}><ArrowDownToLine />Zwróć broń</button><Link className="action" href="/operations/issue-ammunition"><ArrowUpFromLine />Wydaj amunicję</Link><Link className="action" href="/operations/return-ammunition"><ArrowDownToLine />Zwróć amunicję</Link><Link className="action" href="/operations/add-weapon"><FilePlus2 />Dodaj broń</Link><Link className="action" href="/operations/add-ammunition"><FilePlus2 />Dodaj amunicję</Link><Link className="action" href="/prints"><Printer />Wydruki</Link></div>{dialog === "issue" && <IssueWeaponDialog open onClose={close} />}{dialog === "return" && <ReturnWeaponDialog open operatorName={operatorName} onClose={close} />}</>;
}

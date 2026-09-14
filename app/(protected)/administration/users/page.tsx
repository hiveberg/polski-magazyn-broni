import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "@/components/entity-forms";
import { UserStatusButton } from "@/components/admin-controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Użytkownicy" };
export default async function Page() {
  await requireUser({ admin: true }); const users = await prisma.user.findMany({ where: { isBootstrap: false }, orderBy: [{ active: "desc" }, { lastName: "asc" }] });
  return <div className="page"><PageHeader eyebrow="Administracja" title="Użytkownicy" description="Dezaktywacja konta nie usuwa żadnych historycznych powiązań." /><section className="page-card"><h2 className="section-heading">Dodaj użytkownika</h2><UserForm /></section><section className="page-card"><h2 className="section-heading">Konta</h2><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Użytkownik</th><th>Login</th><th>Rola</th><th>Upoważnienie</th><th>Ostatnie logowanie</th><th>Status</th><th>Akcja</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.firstName} {user.lastName}</td><td>{user.login}</td><td>{user.role === "ADMIN" ? "Administrator" : "Uprawniony"}</td><td>{user.isAuthorized ? "Tak" : "Nie"}</td><td>{formatDateTime(user.lastLoginAt)}</td><td><span className={`badge ${user.active ? "ok" : "bad"}`}>{user.active ? "Aktywny" : "Nieaktywny"}</span></td><td><UserStatusButton id={user.id} active={user.active} /></td></tr>)}</tbody></table></div></section></div>;
}

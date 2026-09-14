import { readFile } from "node:fs/promises";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { backupFile, createBackup, restoreBackup } from "@/lib/backup";
import { errorResponse, DomainError } from "@/lib/errors";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const result = await createBackup("MANUAL", actor); return Response.json({ id: result.id, filename: result.filename, sha256: result.sha256, downloadUrl: `/api/backups?id=${result.id}` }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) {
  try { await requireApiUser({ admin: true }); const id = new URL(request.url).searchParams.get("id"); if (!id) throw new DomainError("Brak identyfikatora backupu.", "MISSING_ID"); const { record, path } = await backupFile(id); return new Response(await readFile(path), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${record.filename}"`, "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); if (request.headers.get("x-confirm-restore") !== "ODTWÓRZ") throw new DomainError("Odtworzenie wymaga jawnego potwierdzenia.", "RESTORE_CONFIRMATION_REQUIRED"); const buffer = Buffer.from(await request.arrayBuffer()); return Response.json(await restoreBackup(buffer, actor)); }
  catch (error) { return errorResponse(error); }
}

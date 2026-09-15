import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { DomainError, errorResponse } from "@/lib/errors";
import { documentSchema } from "@/lib/validation/schemas";
import { deleteDocument } from "@/lib/domain/documents";

export async function GET(request: Request) {
  try {
    await requireApiUser(); const params = new URL(request.url).searchParams; const q = params.get("q")?.trim(); const from = params.get("from"); const to = params.get("to"); const type = params.get("type");
    const documents = await prisma.document.findMany({
      where: {
        ...(q ? { OR: [{ number: { contains: q } }, { description: { contains: q } }, { parties: { contains: q } }] } : {}),
        ...(from || to ? { documentDate: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) } } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: { attachments: true, _count: { select: { weapons: true, weaponEntries: true, ammoEntries: true, weaponEvents: true, authorizations: true } } }, orderBy: { documentDate: "desc" }, take: 250,
    });
    return Response.json({ documents });
  }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const input = documentSchema.parse(await request.json()); const name = `${actor.firstName} ${actor.lastName}`;
    const document = await prisma.$transaction(async (tx) => { const created = await tx.document.create({ data: { ...input, createdById: actor.id, createdByName: name } }); await appendAudit(tx, { userId: actor.id, userSnapshot: name, operation: "DOCUMENT_CREATED", entityType: "Document", entityId: created.id, sessionId: actor.sessionId, payload: { type: input.type, number: input.number, documentDate: input.documentDate.toISOString(), description: input.description } }); return created; });
    return Response.json({ document }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const body = await request.json(); const id = zId(body.id); const input = documentSchema.parse(body);
    const previous = await prisma.document.findUnique({ where: { id } }); if (!previous) throw new DomainError("Nie znaleziono dokumentu.", "DOCUMENT_NOT_FOUND", 404);
    const document = await prisma.$transaction(async (tx) => { const updated = await tx.document.update({ where: { id }, data: input }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "DOCUMENT_UPDATED", entityType: "Document", entityId: id, sessionId: actor.sessionId, payload: { previous: { type: previous.type, number: previous.number, documentDate: previous.documentDate, description: previous.description, parties: previous.parties }, current: input } }); return updated; });
    return Response.json({ document });
  } catch (error) { return errorResponse(error); }
}

function zId(value: unknown) {
  if (typeof value !== "string" || !value) throw new DomainError("Brak identyfikatora dokumentu.", "DOCUMENT_ID_REQUIRED");
  return value;
}

export async function DELETE(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const id = zId(new URL(request.url).searchParams.get("id"));
    await deleteDocument(id, actor);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

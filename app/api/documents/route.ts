import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse } from "@/lib/errors";
import { documentSchema } from "@/lib/validation/schemas";

export async function GET() {
  try { await requireApiUser(); return Response.json({ documents: await prisma.document.findMany({ orderBy: { documentDate: "desc" }, take: 250 }) }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const input = documentSchema.parse(await request.json()); const name = `${actor.firstName} ${actor.lastName}`;
    const document = await prisma.$transaction(async (tx) => { const created = await tx.document.create({ data: { ...input, createdById: actor.id, createdByName: name } }); await appendAudit(tx, { userId: actor.id, userSnapshot: name, operation: "DOCUMENT_CREATED", entityType: "Document", entityId: created.id, sessionId: actor.sessionId, payload: { type: input.type, number: input.number, documentDate: input.documentDate.toISOString(), description: input.description } }); return created; });
    return Response.json({ document }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

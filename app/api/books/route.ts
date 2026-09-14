import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { bookSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const type = new URL(request.url).searchParams.get("type") ?? undefined;
    const books = await prisma.registerBook.findMany({ where: type ? { type: type as never } : undefined, orderBy: { series: "asc" } });
    return Response.json({ books });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const input = bookSchema.parse(await request.json());
    const existing = await prisma.registerBook.findUnique({ where: { series: input.series } });
    if (existing) throw new DomainError(`Seria ${input.series} jest już używana.`, "DUPLICATE_BOOK_SERIES");
    const book = await prisma.$transaction(async (tx) => {
      const created = await tx.registerBook.create({ data: input });
      await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "BOOK_CREATED", entityType: "RegisterBook", entityId: created.id, sessionId: actor.sessionId, payload: input });
      return created;
    });
    return Response.json({ book }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

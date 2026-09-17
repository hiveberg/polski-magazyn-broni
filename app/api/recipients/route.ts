import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { appendAudit } from "@/lib/domain/audit";
import { errorResponse } from "@/lib/errors";
import { normalizeRecipientSearch } from "@/lib/recipient-search";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  reference: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(120).optional()),
});

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const params = new URL(request.url).searchParams;
    const search = normalizeRecipientSearch(params.get("search") ?? "");
    const limit = Math.min(Math.max(Number(params.get("limit")) || 5, 1), 5);
    const candidates = await prisma.recipient.findMany({
      where: search ? { OR: [{ normalizedName: { contains: search } }, { normalizedReference: { contains: search } }] } : undefined,
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      take: search ? 30 : limit,
      select: { id: true, name: true, reference: true },
    });
    const recipients = candidates
      .sort((left, right) => Number(normalizeRecipientSearch(right.name).startsWith(search)) - Number(normalizeRecipientSearch(left.name).startsWith(search)) || left.name.localeCompare(right.name, "pl"))
      .slice(0, limit);
    return Response.json({ recipients });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const actor = await requireApiUser();
    const input = createSchema.parse(await request.json());
    const recipient = await prisma.$transaction(async (tx) => {
      const created = await tx.recipient.create({ data: {
        name: input.name,
        reference: input.reference,
        normalizedName: normalizeRecipientSearch(input.name),
        normalizedReference: input.reference ? normalizeRecipientSearch(input.reference) : null,
        createdById: actor.id,
        createdByName: `${actor.firstName} ${actor.lastName}`,
      } });
      await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "RECIPIENT_CREATED", entityType: "Recipient", entityId: created.id, sessionId: actor.sessionId, payload: { name: created.name, reference: created.reference } });
      return created;
    });
    return Response.json({ recipient }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

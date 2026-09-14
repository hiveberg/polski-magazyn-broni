import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { normalizeCaliber } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({ canonicalName: z.string().trim().min(2).max(120), aliases: z.array(z.string().trim().min(1).max(120)).max(50).default([]) });

export async function GET(request: Request) {
  try {
    await requireApiUser(); const q = new URL(request.url).searchParams.get("q")?.trim();
    const normalized = q ? normalizeCaliber(q) : undefined;
    const calibers = await prisma.caliber.findMany({ where: q ? { active: true, OR: [{ canonicalName: { contains: q } }, { aliases: { some: { normalized: { contains: normalized } } } }] } : { active: true }, include: { aliases: { take: 12 } }, orderBy: { canonicalName: "asc" }, take: q ? 30 : 250 });
    return Response.json({ calibers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const input = schema.parse(await request.json());
    if (await prisma.caliber.findUnique({ where: { canonicalName: input.canonicalName } })) throw new DomainError(`Kaliber ${input.canonicalName} już istnieje.`, "DUPLICATE_CALIBER");
    const aliases = new Map([input.canonicalName, ...input.aliases].map((alias) => [normalizeCaliber(alias), alias]));
    const conflict = await prisma.caliberAlias.findFirst({ where: { normalized: { in: [...aliases.keys()] } }, include: { caliber: true } });
    if (conflict) throw new DomainError(`Alias „${conflict.alias}” jest już przypisany do kalibru ${conflict.caliber.canonicalName}.`, "DUPLICATE_CALIBER_ALIAS");
    const caliber = await prisma.$transaction(async (tx) => {
      const created = await tx.caliber.create({ data: { canonicalName: input.canonicalName, source: "manual" } });
      for (const [normalized, alias] of aliases) await tx.caliberAlias.create({ data: { caliberId: created.id, alias, normalized } });
      await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "CALIBER_CREATED", entityType: "Caliber", entityId: created.id, sessionId: actor.sessionId, payload: input }); return created;
    });
    return Response.json({ caliber }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

import { z } from "zod";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { createCorrection } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { pinSchema } from "@/lib/validation/schemas";

const schema = z.object({ entryId: z.string().min(1), quantityDelta: z.coerce.number().int().max(-1), note: z.string().trim().min(5).max(1000), pin: pinSchema });
export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); return Response.json({ correction: await createCorrection(schema.parse(await request.json()), actor) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

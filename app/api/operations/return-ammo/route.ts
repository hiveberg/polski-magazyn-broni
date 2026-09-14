import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { returnAmmunition } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { returnAmmoSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = returnAmmoSchema.parse(await request.json()); return Response.json(await returnAmmunition(input, actor)); }
  catch (error) { return errorResponse(error); }
}

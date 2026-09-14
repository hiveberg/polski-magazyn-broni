import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { returnWeapon } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { returnWeaponSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = returnWeaponSchema.parse(await request.json()); return Response.json({ issue: await returnWeapon(input, actor) }); }
  catch (error) { return errorResponse(error); }
}

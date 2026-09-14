import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { issueAmmunition } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { issueAmmoSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = issueAmmoSchema.parse(await request.json()); return Response.json({ issue: await issueAmmunition(input, actor) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

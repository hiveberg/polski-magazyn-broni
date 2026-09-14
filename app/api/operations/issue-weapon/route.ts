import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { issueWeapon } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { issueWeaponSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = issueWeaponSchema.parse(await request.json()); return Response.json(await issueWeapon(input, actor), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

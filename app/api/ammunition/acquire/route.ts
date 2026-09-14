import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse } from "@/lib/errors";
import { acquireAmmunition } from "@/lib/domain/business";
import { ammoAcquisitionSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = ammoAcquisitionSchema.parse(await request.json()); return Response.json({ entry: await acquireAmmunition(input, actor) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

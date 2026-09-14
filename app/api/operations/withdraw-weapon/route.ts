import { z } from "zod";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { withdrawWeapon } from "@/lib/domain/business";
import { errorResponse } from "@/lib/errors";
import { pinSchema } from "@/lib/validation/schemas";

const schema = z.object({ weaponId: z.string().min(1), documentId: z.string().min(1), basis: z.string().trim().min(3).max(500), recipient: z.string().trim().max(200).optional(), pin: pinSchema, status: z.enum(["WITHDRAWN", "TRANSFERRED", "DEREGISTERED"]) });

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = schema.parse(await request.json()); return Response.json({ weapon: await withdrawWeapon(input, actor) }); }
  catch (error) { return errorResponse(error); }
}

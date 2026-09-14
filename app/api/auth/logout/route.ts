import { destroySession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try { await assertSameOrigin(request); await destroySession(); return Response.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}

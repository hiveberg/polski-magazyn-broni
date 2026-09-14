import { requireApiUser } from "@/lib/auth/session";
import { verifyAuditChain } from "@/lib/domain/audit";
import { errorResponse } from "@/lib/errors";

export async function POST() {
  try { await requireApiUser({ admin: true }); return Response.json(await verifyAuditChain()); }
  catch (error) { return errorResponse(error); }
}

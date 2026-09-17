import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse } from "@/lib/errors";
import { addWeapon } from "@/lib/domain/business";
import { weaponInputSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    await requireApiUser(); const params = new URL(request.url).searchParams; const search = params.get("search")?.trim(); const issuedOnly = params.get("issued") === "true"; const [setting, grouping] = await Promise.all([prisma.systemSetting.findUnique({ where: { key: "showInactiveWeaponsInGrid" } }), prisma.systemSetting.findUnique({ where: { key: "groupWeaponsByType" } })]); const showInactive = setting?.value !== false;
    const weapons = await prisma.weapon.findMany({ where: { ...(issuedOnly ? { status: "ISSUED" as const } : !showInactive ? { status: { in: ["IN_STORAGE", "ISSUED"] as const } } : {}), ...(search ? { OR: [{ registryRef: { contains: search } }, { name: { contains: search } }, { displayName: { contains: search } }, { brand: { contains: search } }, { serialNumber: { contains: search } }, { caliber: { canonicalName: { contains: search } } }, { book: { series: { contains: search.toUpperCase() } } }] } : {}) }, include: { caliber: true, book: true, images: { orderBy: { createdAt: "asc" }, take: 1 }, issues: { where: { status: "ACTIVE" }, take: 1, include: { ammoIssues: { where: { status: "ACTIVE" } } } } }, orderBy: [{ type: "asc" }, { book: { series: "asc" } }, { positionNo: "asc" }] });
    return Response.json({ weapons, settings: { groupWeaponsByType: grouping?.value !== false } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = weaponInputSchema.parse(await request.json()); return Response.json({ weapon: await addWeapon(input, actor) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

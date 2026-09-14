import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await requireApiUser(); const caliberId = new URL(request.url).searchParams.get("caliberId") ?? undefined;
    const books = await prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, orderBy: { series: "asc" } });
    const stocks = await Promise.all(books.map(async (book) => { const totals = await prisma.ammunitionRegisterEntry.aggregate({ where: { bookId: book.id, ...(caliberId ? { caliberId } : {}) }, _sum: { quantityIn: true, quantityOut: true } }); return { book, available: (totals._sum.quantityIn ?? 0) - (totals._sum.quantityOut ?? 0) }; }));
    return Response.json({ stocks: stocks.filter((stock) => stock.available > 0) });
  } catch (error) { return errorResponse(error); }
}

import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import { getAmmoStockBalances, sumAmmoStock } from "@/lib/ammunition-stock";

export async function GET(request: Request) {
  try {
    await requireApiUser(); const caliberId = new URL(request.url).searchParams.get("caliberId") ?? undefined;
    const books = await prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, orderBy: { series: "asc" } });
    const balances = await getAmmoStockBalances(prisma, { bookIds: books.map((book) => book.id), caliberId });
    const allStocks = books.map((book) => {
      const stock = sumAmmoStock([...balances.values()].filter((balance) => balance.bookId === book.id));
      return { book, ...stock };
    });
    const total = sumAmmoStock(allStocks);
    const stocks = allStocks.filter((stock) => stock.available > 0);
    return Response.json({ stocks, totalLedger: total.ledger, totalReserved: total.reserved, totalAvailable: total.available });
  } catch (error) { return errorResponse(error); }
}

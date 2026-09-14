export class DomainError extends Error {
  constructor(message: string, public readonly code = "DOMAIN_ERROR", public readonly status = 400) {
    super(message);
    this.name = "DomainError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof DomainError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("Nieobsłużony błąd aplikacji", error);
  void logTechnical("error", "UNHANDLED_API_ERROR", { name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? error.message.slice(0, 1000) : "Nieznany błąd" });
  return Response.json({ error: "Nie udało się wykonać operacji. Spróbuj ponownie." }, { status: 500 });
}
import { logTechnical } from "@/lib/logger";

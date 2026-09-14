import { timingSafeEqual, createHash } from "node:crypto";
import { headers } from "next/headers";
import { DomainError } from "@/lib/errors";

export function tokenHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const target = new URL(request.url);
  const originUrl = new URL(origin);
  const expectedHost = request.headers.get("host") ?? target.host;
  const expectedProtocol = (request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || target.protocol.replace(":", "")).toLowerCase();
  if (originUrl.host.toLowerCase() !== expectedHost.toLowerCase() || originUrl.protocol.replace(":", "").toLowerCase() !== expectedProtocol) {
    throw new DomainError("Odrzucono żądanie z innego źródła.", "CSRF_REJECTED", 403);
  }
}

export async function requestMetadata() {
  const values = await headers();
  return { userAgent: values.get("user-agent")?.slice(0, 300) ?? null, forwardedForHash: values.get("x-forwarded-for") ? tokenHash(values.get("x-forwarded-for")!.split(",")[0].trim()) : null };
}

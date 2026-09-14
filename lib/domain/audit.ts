import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
  return value instanceof Date ? value.toISOString() : value;
}

export function stableJson(value: unknown) { return JSON.stringify(sortValue(value)); }
export function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }

export async function appendAudit(tx: Prisma.TransactionClient, input: { userId?: string | null; userSnapshot?: string | null; operation: string; entityType: string; entityId?: string | null; payload: Prisma.InputJsonValue; sessionId?: string | null; requestMetadata?: Prisma.InputJsonValue }) {
  const previous = await tx.auditEvent.findFirst({ orderBy: { sequence: "desc" } });
  const sequence = (previous?.sequence ?? 0) + 1;
  const timestamp = new Date();
  const payloadHash = sha256(stableJson(input.payload));
  const auditHash = sha256(stableJson({ sequence, timestamp, userId: input.userId ?? null, operation: input.operation, entityType: input.entityType, entityId: input.entityId ?? null, payloadHash, previousAuditHash: previous?.auditHash ?? null }));
  return tx.auditEvent.create({ data: { sequence, timestamp, userId: input.userId, userSnapshot: input.userSnapshot, operation: input.operation, entityType: input.entityType, entityId: input.entityId, payload: input.payload, payloadHash, previousAuditHash: previous?.auditHash, auditHash, sessionId: input.sessionId, requestMetadata: input.requestMetadata } });
}

export async function verifyAuditChain() {
  const events = await prisma.auditEvent.findMany({ orderBy: { sequence: "asc" } });
  let previous: string | null = null;
  for (const event of events) {
    const payloadHash = sha256(stableJson(event.payload));
    const auditHash = sha256(stableJson({ sequence: event.sequence, timestamp: event.timestamp, userId: event.userId ?? null, operation: event.operation, entityType: event.entityType, entityId: event.entityId ?? null, payloadHash, previousAuditHash: previous }));
    if (event.payloadHash !== payloadHash || event.previousAuditHash !== previous || event.auditHash !== auditHash) return { valid: false, checked: event.sequence, brokenAt: event.sequence, expected: auditHash, actual: event.auditHash };
    previous = event.auditHash;
  }
  return { valid: true, checked: events.length, headHash: previous };
}

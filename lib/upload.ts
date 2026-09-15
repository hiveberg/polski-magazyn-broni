import { extname } from "node:path";
import { DomainError } from "@/lib/errors";

export const allowedUploadTypes = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function validSignature(mimeType: string, buffer: Buffer) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function validateUpload(file: File, options: { imagesOnly?: boolean; maxBytes?: number } = {}) {
  const types = options.imagesOnly ? allowedImageTypes : allowedUploadTypes;
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  if (!types.has(file.type) || file.size <= 0 || file.size > maxBytes) {
    throw new DomainError(options.imagesOnly ? "Dozwolone są zdjęcia JPG, PNG i WebP do 8 MB." : "Dozwolone są PDF, JPG, PNG i WebP do 8 MB.", "UNSUPPORTED_UPLOAD");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validSignature(file.type, buffer)) throw new DomainError("Zawartość pliku nie odpowiada deklarowanemu formatowi.", "INVALID_FILE_SIGNATURE");
  return { buffer, extension: types.get(file.type) ?? extname(file.name) };
}

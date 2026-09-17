import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);
const optionalWeaponType = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.enum(["HANDGUN", "LONG_GUN"]).optional(),
);

export const loginSchema = z.object({ login: z.string().trim().min(1).max(80), password: z.string().min(1).max(200) });
export const passwordSchema = z.string().min(12, "Hasło musi mieć co najmniej 12 znaków.").max(200).regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Dodaj wielką literę.").regex(/[a-ząćęłńóśźż]/, "Dodaj małą literę.").regex(/\d/, "Dodaj cyfrę.");
export const pinSchema = z.string().regex(/^\d{4}$/, "PIN musi mieć dokładnie 4 cyfry.");
export const onboardingSchema = z.object({ firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(100), login: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/), temporaryPassword: passwordSchema });
export const changePasswordSchema = z.object({ password: passwordSchema, confirmation: z.string() }).refine((data) => data.password === data.confirmation, { message: "Hasła nie są takie same.", path: ["confirmation"] });
export const documentSchema = z.object({ type: z.enum(["INVOICE", "AGREEMENT", "TRANSFER_DOCUMENT", "WITHDRAWAL_DOCUMENT", "AUTHORIZATION", "OTHER"]), number: z.string().trim().max(100).optional(), documentDate: z.coerce.date(), description: z.string().trim().min(3).max(500), parties: z.string().trim().max(500).optional() });
export const bookSchema = z.object({ type: z.enum(["WEAPON", "AMMUNITION", "WEAPON_ISSUE", "AMMUNITION_ISSUE"]), series: z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}$/), name: z.string().trim().min(2).max(120) });
export const weaponInputSchema = z.object({ bookId: z.string().min(1), caliberId: z.string().min(1), documentId: z.string().min(1), name: z.string().trim().min(2).max(120), brand: z.string().trim().min(1).max(100), productionYear: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).optional(), weaponSeries: optionalText(100), serialNumber: z.string().trim().min(1).max(120), otherIdentifyingMarks: optionalText(500), accessories: optionalText(500), type: optionalWeaponType, magazineCount: z.coerce.number().int().min(0).max(1000).default(0), acquisitionBasis: z.string().trim().min(3).max(500), acquisitionDate: z.coerce.date().optional(), registeredAt: z.coerce.date(), certificateNumber: optionalText(120), notes: optionalText(1000), pin: pinSchema });
export const ammoAcquisitionSchema = z.object({ bookId: z.string().min(1), caliberId: z.string().min(1), documentId: z.string().min(1), ammunitionType: optionalText(120), quantity: z.coerce.number().int().positive().max(10_000_000), basis: z.string().trim().min(3).max(500), effectiveAt: z.coerce.date(), pin: pinSchema });
export const issueWeaponSchema = z.object({ weaponId: z.string().min(1), bookId: z.string().min(1), recipientId: optionalText(120), recipientName: z.string().trim().min(2).max(160), recipientReference: optionalText(120), magazineCount: z.coerce.number().int().min(0).max(1000), pin: pinSchema, ammo: z.object({ issueBookId: z.string().min(1), sourceBookId: optionalText(120), quantity: z.coerce.number().int().positive(), ammunitionType: z.string().trim().min(2).max(120) }).optional() });
export const returnWeaponSchema = z.object({ issueId: z.string().min(1), returnedFromName: z.string().trim().min(2).max(160), returnedAmmoQuantity: z.coerce.number().int().min(0).optional(), pin: pinSchema });
export const issueAmmoSchema = z.object({ bookId: z.string().min(1), sourceBookId: optionalText(120), caliberId: z.string().min(1), ammunitionType: z.string().trim().min(2).max(120), quantity: z.coerce.number().int().positive(), recipientId: optionalText(120), recipientName: z.string().trim().min(2).max(160), recipientReference: optionalText(120), pin: pinSchema, parentIssueId: optionalText(120) });
export const topUpAmmoSchema = z.object({ issueId: z.string().min(1), quantity: z.coerce.number().int().positive().max(10_000_000), pin: pinSchema });
export const returnAmmoSchema = z.object({ issueId: z.string().min(1), returnedQuantity: z.coerce.number().int().min(0), pin: pinSchema });

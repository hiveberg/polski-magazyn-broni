import { DomainError } from "@/lib/errors";

export function bookSeriesFromIndex(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= 702) throw new DomainError("Numer serii księgi jest poza zakresem A–ZZ.", "INVALID_BOOK_SERIES");
  return index < 26 ? String.fromCharCode(65 + index) : String.fromCharCode(65 + Math.floor((index - 26) / 26)) + String.fromCharCode(65 + ((index - 26) % 26));
}

export function nextBookSeries(existing: string[]) {
  const occupied = new Set(existing.map((value) => value.toUpperCase()));
  for (let i = 0; i < 702; i += 1) { const candidate = bookSeriesFromIndex(i); if (!occupied.has(candidate)) return candidate; }
  throw new DomainError("Wykorzystano wszystkie serie ksiąg A–ZZ.", "BOOK_SERIES_EXHAUSTED");
}

export function assertBookSeries(series: string) {
  const value = series.trim().toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(value)) throw new DomainError("Seria księgi musi mieć format A–Z lub AA–ZZ.", "INVALID_BOOK_SERIES");
  return value;
}

export function registryRef(series: string, position: number) {
  if (!Number.isInteger(position) || position < 1) throw new DomainError("Numer pozycji musi być dodatnią liczbą całkowitą.", "INVALID_POSITION");
  return `${assertBookSeries(series)}${position}`;
}

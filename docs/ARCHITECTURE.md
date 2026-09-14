# Architektura

PMB jest monolitem local-first. Jedna instancja Next.js obsługuje interfejs, uwierzytelnianie i API, serwisy domenowe wykonują reguły biznesowe, Prisma zapisuje stan w SQLite, a załączniki i backupy pozostają na lokalnym dysku.

```text
Przeglądarka
    │ HTTPS / sesja HttpOnly
    ▼
Next.js App Router ── strony serwerowe + Route Handlers
    │
    ├── auth / RBAC / PIN
    ├── serwisy domenowe i transakcje
    ├── audyt + hash chain
    └── backup / restore
          │
          ├── Prisma ── SQLite (WAL, FK, busy timeout)
          └── filesystem ── załączniki i ZIP-y
```

## Granice

- Komponenty serwerowe czytają dane bezpośrednio z Prisma. Interaktywne formularze są małymi komponentami klienckimi.
- Każdy mutujący Route Handler ponownie sprawdza sesję, rolę, upoważnienie i same-origin; operacje prawnie istotne wymagają PIN-u.
- Operacja domenowa obejmuje w jednej transakcji zmianę bieżącego stanu, wpis księgi, historię oraz audyt. Błąd dowolnego elementu wycofuje całość.
- Numery pozycji przydziela aktywna księga. Identyfikator, np. `A12`, jest snapshotem i nie zmienia się po zamknięciu lub wycofaniu pozycji.
- Stan amunicji jest wyliczany jako suma przychodów minus suma rozchodów; nie istnieje ręcznie edytowane pole „stan”.

## Local-first

Brak zależności od SaaS, kolejki i zewnętrznej bazy upraszcza odtworzenie oraz kontrolę danych. Model zakłada jeden aktywny proces aplikacji nad jednym plikiem SQLite. Przy większej liczbie instancji lub magazynów potrzebna byłaby inna warstwa koordynacji zapisów.

## Struktura kodu

- `app/` — strony i API;
- `components/` — UI i dialogi operacyjne;
- `lib/domain/` — invariants, transakcje, audyt;
- `lib/auth/` — sesje, hasła, role, PIN;
- `lib/backup.ts` — tworzenie, weryfikacja i restore;
- `prisma/` — schema, migracje i seed;
- `scripts/` — instalacja, migracje i generowanie słownika;
- `tests/` — testy domenowe i E2E.

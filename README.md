# PMBP — Polski Magazyn Broni Palnej

PMBP — Polski Magazyn Broni Palnej to otwartoźródłowa, lokalna aplikacja do prowadzenia ewidencji broni palnej i amunicji, obsługi wydań i zwrotów, dokumentów, kontroli, audytu oraz wydruków. Interfejs i model danych zachowują pojęcia znane z papierowych ksiąg: księga, pozycja, identyfikator `A12`, przychód, wydanie, przyjęcie i rozchód.

Strona projektu: [pmbp.pl](https://pmbp.pl)

Projekt jest przeznaczony do self-hostingu na pojedynczym, zaufanym serwerze organizacji. Nie wymaga usług chmurowych.

## Najważniejsze funkcje

- ewidencja każdego egzemplarza broni i ledger amunicji;
- oddzielne książki serii `A`–`ZZ` z niezmiennymi numerami pozycji; ta sama seria może występować w różnych typach ksiąg;
- wydanie i zwrot broni, także z powiązaną amunicją, wykonywane atomowo;
- samodzielne wydania, zwroty, rozchody i łańcuchy kolejnych wydań amunicji, z automatycznym doborem jednej lub wielu ksiąg źródłowych;
- dokumenty źródłowe z wieloma bezpiecznymi załącznikami lokalnymi, podglądem i kontrolowaną edycją;
- role administratora i osoby upoważnionej, sesje oraz 4-cyfrowy PIN operacyjny;
- karta egzemplarza z edytowalną nazwą użytkową, zdjęciami i stronicowaną historią wydań;
- korekty bez kasowania źródła i audyt z łańcuchem SHA-256;
- codzienne oraz ręczne backupy, manifest, sumy kontrolne i bezpieczny restore;
- papieropodobne rejestry, raport kontroli i wydruki;
- startowy słownik 108 współczesnych kalibrów z 320 aliasami źródłowymi (235 unikalnych po normalizacji).

## Wymagania

- Node.js 22 lub nowszy (zalecana aktualna wersja LTS);
- npm 10 lub nowszy;
- system Windows, macOS albo Linux z lokalnym, trwałym dyskiem;
- alternatywnie Docker z Docker Compose.

## Szybki start

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Pierwsze logowanie to `admin` / `admin`. To wyłącznie konto bootstrap: aplikacja natychmiast wymusi utworzenie właściwego administratora, a potem zmianę hasła i ustawienie PIN-u. Nie używaj danych bootstrap w codziennej pracy.

Instalacja produkcyjna:

```bash
npm ci
cp .env.example .env
npm run setup
npm run build
npm run start
```

### Windows 10

Najprościej uruchomić dwuklikiem `setup-windows.cmd`. Instalator sprawdzi lub doinstaluje Node.js LTS, zachowa istniejący plik `.env` i bazę, zainstaluje zależności, wykona migracje oraz zbuduje aplikację. Po jednorazowym potwierdzeniu UAC utworzy zadanie systemowe „PMBP - Polski Magazyn Broni Palnej”, uruchomi aplikację i będzie ją uruchamiał automatycznie przy każdym starcie Windows — jeszcze przed zalogowaniem użytkownika. Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

Z PowerShell można wskazać inny port lub przygotować instalację bez uruchamiania serwera:

```powershell
.\setup-windows.ps1 -InstallNode -Port 3003
.\setup-windows.ps1 -InstallNode -Port 3003 -NoStart
.\setup-windows.ps1 -InstallNode -Port 3003 -NoAutoStart
```

`-NoStart` przygotowuje i rejestruje aplikację, ale nie uruchamia jej od razu. `-NoAutoStart` całkowicie pomija tworzenie zadania systemowego i pozostawia ręczne uruchamianie przez `start-windows.cmd`. Opcjonalny pierwszy argument tego pliku określa port, np. `start-windows.cmd 3003`. Log procesu uruchamianego automatycznie znajduje się w `data/logs/windows-service.log`. Katalog `data` i istniejąca konfiguracja `.env` nie są usuwane ani nadpisywane.

Przed wystawieniem systemu w sieci organizacji zastosuj TLS i reverse proxy, ogranicz dostęp sieciowo oraz wykonuj zewnętrzną kopię katalogu `data/backups`.

## Docker

```bash
docker compose up --build -d
```

Aplikacja będzie dostępna na porcie 3000, a trwałe dane znajdą się w nazwanym wolumenie `pmb-data`. Backup wolumenu pozostaje obowiązkiem operatora.

## Dane demonstracyjne

Po zwykłym `npm run setup` możesz dodać neutralny zestaw deweloperski:

```bash
npm run db:seed:dev
```

Login demonstracyjny: `jan.kowalski`, hasło: `Magazyn123!`, PIN: `1234`. Seed tworzy 40 egzemplarzy, sześć ksiąg i przykładowe stany amunicji. Nigdy nie używaj tych danych w instalacji rzeczywistej.

## Dane i aktualizacje

- baza SQLite: `data/database.sqlite`;
- załączniki dokumentów: `data/uploads/documents`;
- zdjęcia broni: `data/uploads/weapons`;
- backupy: `data/backups`;
- słownik startowy: `data/calibers.modern.json`;
- migracje: `prisma/migrations`.

Bezpieczna aktualizacja ma kolejność: ręczny backup w aplikacji → zatrzymanie procesu → aktualizacja kodu i `npm ci` → `npm run db:migrate` → `npm run build` → start. Nie kopiuj samego pliku SQLite podczas aktywnych zapisów; użyj funkcji backupu.

## Weryfikacja

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run verify` uruchamia lint, kontrolę typów, testy domenowe i produkcyjny build. Test E2E Playwright może wymagać wcześniejszego `npx playwright install chromium`.

## Dokumentacja

- [Architektura](docs/ARCHITECTURE.md)
- [Model danych](docs/DATA_MODEL.md)
- [Backup i odtwarzanie](docs/BACKUP_AND_RESTORE.md)
- [Audyt i integralność](docs/AUDIT_AND_INTEGRITY.md)
- [Mapowanie wymagań prawnych](docs/COMPLIANCE.md)
- [Słownik kalibrów](docs/CALIBERS.md)
- [Eksploatacja](docs/OPERATIONS.md)
- [Testy](docs/TESTING.md)

PMBP jest narzędziem ewidencyjnym, a nie opinią prawną ani gwarancją zgodności. Administrator organizacji powinien zweryfikować konfigurację, procedury, wydruki i aktualny stan prawa przed użyciem produkcyjnym.

## Licencja

Apache License 2.0 — zobacz [LICENSE](LICENSE).

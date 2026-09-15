# Model danych

## Encje główne

| Obszar | Encje | Odpowiedzialność |
| --- | --- | --- |
| Dostęp | `User`, `UserAuthorization`, `Session`, `SecurityEvent` | role, upoważnienie, sesje, blokady PIN i próby logowania |
| Książki | `RegisterBook` | typ, seria `A`–`ZZ`, status i następna pozycja |
| Słownik | `Caliber`, `CaliberAlias` | nazwa kanoniczna, aktywność, pochodzenie i wyszukiwanie po aliasach |
| Dokumenty | `Document`, `Attachment` | podstawa operacji, metadane i wiele lokalnych plików z SHA-256 |
| Broń | `Weapon`, `WeaponImage`, `WeaponRegisterEntry`, `WeaponEvent`, `WeaponIssue` | stan egzemplarza, edytowalne metadane i zdjęcia, formalny wpis, pełna historia oraz wydanie/zwrot |
| Amunicja | `AmmunitionRegisterEntry`, `AmmoIssue`, `AmmoIssueAllocation`, `AmmoIssueEvent` | append-only ledger, wydanie, blokady źródłowe, rozliczenie i kontynuacja wydania |
| Integralność | `CorrectionEvent`, `AuditEvent`, `PhysicalVerificationFlag` | nieniszczące korekty, łańcuch audytu i czynności fizyczne |
| Eksploatacja | `BackupRecord`, `SystemSetting` | historia backupów i ustawienia lokalne |

## Najważniejsze invariants

1. Seria księgi ma jedną lub dwie litery `A`–`Z` i jest unikalna w obrębie typu księgi (`UNIQUE(type, series)`).
2. Pozycja jest unikalna w obrębie księgi; referencja tekstowa jest unikalna globalnie.
3. Numer seryjny broni nie może być zarejestrowany ponownie.
4. Wydać można wyłącznie broń `IN_STORAGE`; zwrot dotyczy wyłącznie aktywnego wydania.
5. Broń `WITHDRAWN`, `TRANSFERRED` lub `DEREGISTERED` nie wraca do dostępnego gridu.
6. Stan dostępny amunicji to stan ewidencyjny (`przychód − rozchód`) pomniejszony o `AmmoIssueAllocation` należące do aktywnych wydań.
7. Wydanie nie zmienia ledgeru. System preferuje jedną księgę pokrywającą całość, a dopiero w razie potrzeby dzieli blokadę między kilka ksiąg.
8. Jawne wskazanie księgi źródłowej ogranicza dostępny stan i blokadę do tej księgi. Bez wskazania źródła obowiązuje dobór automatyczny.
9. Rozliczenie nie może wskazać zwrotu większego niż wydanie. Dopiero wtedy powstaje rozchód `wydano − zwrócono`, rozdzielany według kolejności źródłowych blokad; zwrot zwalnia blokadę i nie tworzy przychodu ani korekty.
10. Zapis wydania/rozliczenia, blokady, ledger, snapshoty i audyt są jedną transakcją SQLite.
11. Korekta tworzy `CorrectionEvent`; pierwotny wpis pozostaje bez zmian.
12. Każdy `AuditEvent` zawiera hash payloadu i hash poprzedniego wpisu.

## Snapshoty

Wpisy historyczne przechowują nazwy użytkownika, oznaczenia broni, kaliber i inne dane w chwili operacji. Późniejsza zmiana słownika lub danych konta nie modyfikuje wydrukowanej historii.

## Usuwanie

Relacje istotne dla ewidencji stosują `onDelete: Restrict`. Dokument można usunąć tylko wtedy, gdy nie wskazuje na niego żadna broń, wpis, zdarzenie ani upoważnienie; jego załączniki są wtedy usuwane jawnie. Aplikacja nie udostępnia endpointów kasujących księgi, broń, wpisy ledgeru, wydania, korekty ani audyt. Zmiana formalna powinna powstać jako kolejne zdarzenie.

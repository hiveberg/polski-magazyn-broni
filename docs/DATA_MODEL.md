# Model danych

## Encje główne

| Obszar | Encje | Odpowiedzialność |
| --- | --- | --- |
| Dostęp | `User`, `UserAuthorization`, `Session`, `SecurityEvent` | role, upoważnienie, sesje, blokady PIN i próby logowania |
| Książki | `RegisterBook` | typ, seria `A`–`ZZ`, status i następna pozycja |
| Słownik | `Caliber`, `CaliberAlias` | nazwa kanoniczna, aktywność, pochodzenie i wyszukiwanie po aliasach |
| Dokumenty | `Document`, `Attachment` | podstawa operacji, metadane i lokalny plik z SHA-256 |
| Broń | `Weapon`, `WeaponRegisterEntry`, `WeaponEvent`, `WeaponIssue` | stan egzemplarza, formalny wpis, pełna historia oraz wydanie/zwrot |
| Amunicja | `AmmunitionRegisterEntry`, `AmmoIssue`, `AmmoIssueEvent` | append-only ledger, wydanie, zwrot, rozchód i kontynuacja wydania |
| Integralność | `CorrectionEvent`, `AuditEvent`, `PhysicalVerificationFlag` | nieniszczące korekty, łańcuch audytu i czynności fizyczne |
| Eksploatacja | `BackupRecord`, `SystemSetting` | historia backupów i ustawienia lokalne |

## Najważniejsze invariants

1. Seria księgi jest globalnie unikalna i ma jedną lub dwie litery `A`–`Z`.
2. Pozycja jest unikalna w obrębie księgi; referencja tekstowa jest unikalna globalnie.
3. Numer seryjny broni nie może być zarejestrowany ponownie.
4. Wydać można wyłącznie broń `IN_STORAGE`; zwrot dotyczy wyłącznie aktywnego wydania.
5. Broń `WITHDRAWN`, `TRANSFERRED` lub `DEREGISTERED` nie wraca do dostępnego gridu.
6. Wydanie amunicji nie może przekroczyć stanu obliczonego z ledgeru.
7. Zwrot amunicji nie może przekroczyć ilości wydanej; rozchód = wydano − zwrócono.
8. Zapis wydania/zwrotu, ledger, snapshoty i audyt są jedną transakcją SQLite.
9. Korekta tworzy `CorrectionEvent`; pierwotny wpis pozostaje bez zmian.
10. Każdy `AuditEvent` zawiera hash payloadu i hash poprzedniego wpisu.

## Snapshoty

Wpisy historyczne przechowują nazwy użytkownika, oznaczenia broni, kaliber i inne dane w chwili operacji. Późniejsza zmiana słownika lub danych konta nie modyfikuje wydrukowanej historii.

## Usuwanie

Relacje istotne dla ewidencji stosują `onDelete: Restrict`. Aplikacja nie udostępnia endpointów kasujących księgi, broń, wpisy ledgeru, wydania, korekty ani audyt. Zmiana formalna powinna powstać jako kolejne zdarzenie.

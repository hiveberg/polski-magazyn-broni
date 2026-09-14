# Mapowanie wymagań prawnych

PMB został zaprojektowany tak, aby wspierać realizację obowiązków ewidencyjnych, ale nie jest certyfikatem zgodności ani poradą prawną. Mapowanie opiera się na aktualnym tekście jednolitym rozporządzenia Ministra Spraw Wewnętrznych i Administracji w sprawie przechowywania, noszenia oraz ewidencjonowania broni i amunicji, ogłoszonym w Dz.U. 2023 poz. 364. Operator powinien przed wdrożeniem sprawdzić [urzędowy tekst w ELI](https://eli.gov.pl/api/acts/DU/2023/364/text.html) i późniejsze zmiany.

## § 9 — ewidencja posiadanej broni i amunicji

| Obowiązek / pole | Realizacja w PMB |
| --- | --- |
| rodzaj, marka, kaliber, seria/numer i rok produkcji broni | `Weapon` oraz niezmienny snapshot `WeaponRegisterEntry` |
| data nabycia, podstawa nabycia i dane z dokumentu | dokument źródłowy, `acquisitionDate`, `acquisitionBasis` i powiązanie z wpisem |
| ilość, kaliber i rodzaj amunicji | append-only `AmmunitionRegisterEntry` z przychodem, rozchodem i saldem |
| dokument zbycia, przekazania lub wycofania | formalne zdarzenie wycofania/przekazania/zdjęcia z dokumentem i snapshotem |
| chronologiczność i identyfikacja pozycji | aktywna księga przydziela pozycję i trwałą referencję, np. `A12` |

## § 10 — książki wydawania i przyjmowania

| Obowiązek / pole | Realizacja w PMB |
| --- | --- |
| data i godzina wydania/przyjęcia | timestamp wydania oraz zwrotu w `WeaponIssue` i `AmmoIssue` |
| dane osoby wydającej, przyjmującej i odbierającej | snapshoty imienia i nazwiska, identyfikator odbiorcy oraz potwierdzenie PIN-em |
| oznaczenie broni i liczba magazynków | snapshot nazwy, marki, kalibru, roku, serii, numeru i świadectwa oraz `magazineCount` |
| ilość i rodzaj amunicji | powiązane albo samodzielne wydanie amunicji z kalibrem, typem i ilością |
| zwrot i ilość zużyta | ilość zwrócona i automatycznie wyliczony rozchód |
| osoba upoważniona | role, aktywność konta, status upoważnienia i administracyjne zarządzanie użytkownikami |

## § 11 — trwałość zapisu elektronicznego

| Wymaganie | Realizacja w PMB |
| --- | --- |
| rejestrowanie wszystkich operacji | formalne wpisy, zdarzenia domenowe i globalny audit log |
| brak kasowania/wymazywania | brak endpointów usuwających; `Restrict` w relacjach; korekty jako nowe zdarzenia |
| możliwość weryfikacji zmian | poprzedni snapshot, autor, czas, przyczyna, PIN i łańcuch SHA-256 |
| kopia zapasowa | scheduler dzienny, backup ręczny, manifest, hashe i historia wykonania |
| ochrona przed zniszczeniem, kradzieżą, zmianą i dostępem | lokalne uwierzytelnienie, RBAC, SameSite/HttpOnly, blokada PIN, walidacja plików; pełna ochrona wymaga również zabezpieczeń hosta i sieci |
| przechowywanie dokumentacji | aplikacja nie usuwa wpisów automatycznie; operator ustala i egzekwuje okres przechowywania zgodnie z aktualnym prawem |

## Materiały projektowe

Widoki i wydruki zostały zestawione z formularzami PDF znajdującymi się w katalogu `Polski Magazyn Broni - zasoby projektowe`: ewidencją broni, ewidencją amunicji, książką wydawania broni, książką wydawania amunicji i wykazem posiadanej amunicji.

## Odpowiedzialność operatora

PMB nie kontroluje fizycznego zabezpieczenia magazynu, systemu operacyjnego, retencji poza aplikacją, poprawności nadanych upoważnień ani tego, czy procedury organizacji odpowiadają aktualnemu prawu. Przed użyciem produkcyjnym należy przeprowadzić przegląd prawny i bezpieczeństwa, zatwierdzić wzory wydruków oraz test odtworzenia kopii.

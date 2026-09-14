# Backup i odtwarzanie

## Zawartość pakietu

Backup jest plikiem ZIP zawierającym:

- spójną migawkę `database.sqlite` utworzoną mechanizmem backupu SQLite;
- katalog `attachments/`;
- `manifest.json` z wersją aplikacji i schematu, czasem utworzenia, licznikami rekordów, hashem głowy audytu oraz sumą SHA-256 każdego pliku.

Po zapisaniu ZIP aplikacja ponownie go otwiera, sprawdza wymagane wpisy i sumy. Migawka bazy przechodzi `integrity_check` oraz `foreign_key_check`.

## Backup automatyczny i ręczny

Scheduler działający wewnątrz procesu sprawdza ustawiony czas co minutę i tworzy maksymalnie jeden backup `AUTO` na dobę. Domyślnie jest to 02:00 w strefie `Europe/Warsaw`. Proces aplikacji musi wtedy działać.

Administrator może w każdej chwili utworzyć backup `MANUAL` na stronie „Kopie zapasowe” i pobrać ZIP. Same pliki w `data/backups` są na tym samym urządzeniu, dlatego operator powinien regularnie kopiować je na zaszyfrowany nośnik poza serwerem i testować odtworzenie.

## Restore

Restore jest operacją administracyjną z jawnym potwierdzeniem `ODTWÓRZ`.

1. Aplikacja odrzuca niebezpieczne ścieżki ZIP i niezgodny format lub wersję schematu.
2. Weryfikuje wszystkie sumy oraz integralność kandydującej bazy.
3. Tworzy automatyczny backup `PRE_RESTORE` bieżących danych.
4. Rozłącza Prisma i opróżnia WAL.
5. Podmienia bazę oraz załączniki, zachowując lokalny rollback do końca kontroli.
6. Ponownie sprawdza bazę; przy błędzie przywraca poprzedni plik i załączniki.

Po udanym restore zrestartuj proces aplikacji, aby odświeżyć wszystkie długowieczne połączenia. Nie odtwarzaj paczki z niezaufanego źródła.

## Awaria całego hosta

Zainstaluj tę samą wersję PMB, skopiuj zweryfikowany ZIP z zewnętrznego nośnika do bezpiecznej lokalizacji, wykonaj bazowy setup, zaloguj się jako administrator i użyj funkcji restore. Zachowaj oryginalny nośnik tylko do odczytu do czasu zakończenia kontroli magazynu.

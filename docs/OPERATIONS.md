# Eksploatacja

## Pierwsze uruchomienie

1. Uruchom `npm run setup`.
2. Zaloguj się `admin` / `admin` wyłącznie lokalnie.
3. Utwórz właściwego administratora, zaloguj się hasłem jednorazowym, zmień je i ustaw PIN.
4. Utwórz co najmniej po jednej księdze: broni, amunicji, wydań broni i wydań amunicji.
5. Skonfiguruj czas backupu i utwórz pierwszy backup ręczny.
6. Dodaj osoby upoważnione i udokumentuj zakres ich uprawnień.

## Codzienna praca

- Dokument wprowadź przed nabyciem lub wycofaniem.
- Nowa broń i amunicja zawsze trafiają do wybranej aktywnej księgi.
- Wydanie broni wybiera konkretny egzemplarz; amunicję można dołączyć albo jawnie pominąć.
- Zwrot zamyka aktywne wydanie. Dla amunicji system oblicza rozchód jako różnicę wydania i zwrotu.
- Błędu formalnego nie poprawiaj w bazie; użyj korekty i podaj przyczynę.
- Przed kontrolą uruchom weryfikację audytu i raport kontroli.

## Utrzymanie

- Codziennie sprawdzaj wynik automatycznego backupu.
- Co najmniej okresowo kopiuj ZIP-y poza host i wykonuj próbny restore.
- Aktualizuj system operacyjny, Node.js i zależności po przetestowaniu na kopii.
- Nie wystawiaj portu Next.js bezpośrednio do Internetu. Użyj reverse proxy, TLS, limitów żądań i reguł sieciowych.
- Dostęp do katalogu `data` nadaj tylko kontu uruchamiającemu PMB i administratorom systemowym.

## Migracje

Runner `scripts/migrate.ts` zapisuje nazwę i SHA-256 każdej zastosowanej migracji w `_pmb_migrations`. Zmiana już wykonanej migracji zatrzymuje start. Nowe migracje muszą być addytywne; przed zmianą destrukcyjną potrzebny jest zweryfikowany backup i osobna procedura migracji danych.

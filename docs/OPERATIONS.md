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
- Wydanie broni wybiera konkretny egzemplarz; amunicję można dołączyć albo jawnie pominąć. Przy wydaniu amunicji pozostaw puste źródło, aby system dobrał jedną lub kilka ksiąg, albo wskaż księgę, jeśli blokada ma być ograniczona wyłącznie do niej.
- Wydanie amunicji tworzy blokadę, ale nie pomniejsza stanu ewidencyjnego. Stan dostępny jest stanem ewidencyjnym pomniejszonym o wszystkie aktywne blokady.
- Rozliczenie zamyka aktywne wydanie. System zapisuje rozchód jako różnicę wydania i zwrotu; zwracane sztuki tylko zwalniają blokadę.
- Akcja „Rozlicz bez zwrotu” zapisuje zwrot równy zero i wymaga PIN-u tak samo jak zwykłe rozliczenie.
- Zakładka „Dokładka” pokazuje aktywne wydania. Dokładka rozlicza wybraną pozycję ze zwrotem równym zero i tworzy nowe wydanie na podaną ilość, zachowując księgę wydań, odbiorcę, dokument, kaliber, typ amunicji oraz powiązanie z bronią. Źródła są dobierane ponownie według dostępnego stanu.
- Błędu formalnego nie poprawiaj w bazie; użyj korekty i podaj przyczynę.
- Przed kontrolą uruchom weryfikację audytu i raport kontroli.

## Utrzymanie

- Codziennie sprawdzaj wynik automatycznego backupu.
- Co najmniej okresowo kopiuj ZIP-y poza host i wykonuj próbny restore.
- Aktualizuj system operacyjny, Node.js i zależności po przetestowaniu na kopii.
- Nie wystawiaj portu Next.js bezpośrednio do Internetu. Użyj reverse proxy, TLS, limitów żądań i reguł sieciowych.
- Dostęp do katalogu `data` nadaj tylko kontu uruchamiającemu PMBP i administratorom systemowym.

## Migracje

Runner `scripts/migrate.ts` zapisuje nazwę i SHA-256 każdej zastosowanej migracji w `_pmb_migrations`. Zmiana już wykonanej migracji zatrzymuje start. Nowe migracje muszą być addytywne; przed zmianą destrukcyjną potrzebny jest zweryfikowany backup i osobna procedura migracji danych.

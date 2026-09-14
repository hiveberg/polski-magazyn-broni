# Audyt i integralność

## Co jest zapisywane

Operacje nabycia, wydania, zwrotu, rozchodu, wycofania, korekty, backupu i zmian administracyjnych tworzą wpis audytu zawierający numer sekwencji, czas, snapshot użytkownika, typ obiektu, identyfikator i payload operacji. Hasła, PIN-y i treść plików nie są zapisywane w audycie.

## Łańcuch hashy

Payload jest kanonizowany i hashowany SHA-256. Hash całego wpisu obejmuje numer sekwencji, timestamp, identyfikator użytkownika, operację, obiekt, hash payloadu i hash poprzedniego wpisu. Funkcja „Zweryfikuj łańcuch” przelicza całość od pierwszego zdarzenia i wskazuje pierwszą niespójność.

Hash chain wykrywa zmianę historii w bazie, ale nie zastępuje podpisu kwalifikowanego ani zewnętrznego systemu timestampingu. Osoba z pełnym dostępem do serwera i wszystkich backupów mogłaby przebudować całą bazę, dlatego integralność organizacyjna wymaga ograniczenia dostępu systemowego i przechowywania kopii poza hostem.

## Append-only i korekty

UI i API nie udostępniają kasowania ani edycji formalnych wpisów. Korekta wskazuje rekord źródłowy, zapisuje jego poprzedni snapshot, poprawione wartości, przyczynę, autora, czas i potwierdzenie PIN. Widoki rejestrów prezentują źródło razem z korektami, bez ukrywania historii.

## Kontrola

Administrator powinien regularnie:

1. uruchamiać weryfikację łańcucha;
2. przeglądać zdarzenia bezpieczeństwa i niezakończone wydania;
3. zachowywać zweryfikowane backupy poza serwerem;
4. wyjaśniać flagi wymagające fizycznej kontroli;
5. porównywać wydruki ze stanem rzeczywistym.

# Testy

## Automatyczne

`npm test` uruchamia scenariusz na odrębnej, tymczasowej bazie SQLite. Pokrywa:

- przydzielanie referencji ksiąg;
- złożoną unikalność serii księgi w obrębie typu;
- wyszukiwanie kalibrów po nazwie i aliasie oraz kolejność sugestii;
- RBAC i aktywne upoważnienie;
- nabycie broni i amunicji;
- rollback całej transakcji przy niedostatecznym stanie;
- wydanie, ponowne wydanie, zwrot i wycofanie broni;
- powiązane i samodzielne wydania amunicji, trwałe blokady, rozliczenie bez wpisów zwrotnych, rozchód wieloksięgowy oraz ochronę stanu dostępnego;
- korektę bez nadpisania źródła;
- blokadę PIN po pięciu próbach;
- wiele załączników, reguły usuwania dokumentów i metadane/zdjęcia broni;
- stronicowanie historii wydań;
- strukturę, manifest i pełny restore backupu wraz z załącznikami oraz zdjęciami;
- poprawny łańcuch audytu oraz wykrycie ingerencji.

`npm run test:e2e` uruchamia realny serwer z osobną bazą i katalogiem uploadów. Scenariusze przechodzą przez onboarding, dokument z dwoma plikami, pickery, dodanie i kartę broni, PIN z błędem i ponowieniem, wydanie/zwrot, przełączanie ksiąg, trzy wartości stanu amunicji, listę nierozliczonych wydań z szybką akcją oraz utworzenie i rozpakowanie backupu. Jeśli Chromium nie jest dostępne:

```bash
npx playwright install chromium
```

## Pełna bramka

```bash
npm run verify
```

Komenda wymaga czystego lintowania, poprawnych typów, przejścia testów domenowych i produkcyjnego buildu. Przed wydaniem wersji wykonaj dodatkowo E2E, test ręczny wydruków, backupu/restore na kopii oraz kontrolę responsywności.

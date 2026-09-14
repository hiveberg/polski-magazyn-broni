# Testy

## Automatyczne

`npm test` uruchamia scenariusz na odrębnej, tymczasowej bazie SQLite. Pokrywa:

- przydzielanie referencji ksiąg;
- RBAC i aktywne upoważnienie;
- nabycie broni i amunicji;
- rollback całej transakcji przy niedostatecznym stanie;
- wydanie, ponowne wydanie, zwrot i wycofanie broni;
- powiązane i samodzielne wydania amunicji, zwrot, rozchód i blokadę stanu ujemnego;
- korektę bez nadpisania źródła;
- blokadę PIN po pięciu próbach;
- strukturę i manifest backupu;
- poprawny łańcuch audytu oraz wykrycie ingerencji.

`npm run test:e2e` uruchamia realny serwer z osobną bazą demonstracyjną i przechodzi w przeglądarce przez logowanie, wydanie oraz zwrot broni. Jeśli Chromium nie jest dostępne:

```bash
npx playwright install chromium
```

## Pełna bramka

```bash
npm run verify
```

Komenda wymaga czystego lintowania, poprawnych typów, przejścia testów domenowych i produkcyjnego buildu. Przed wydaniem wersji wykonaj dodatkowo E2E, test ręczny wydruków, backupu/restore na kopii oraz kontrolę responsywności.

# Słownik kalibrów

Startowy preset został wygenerowany ze słownika `armted-historical-taxonomies-3.json`, a następnie ograniczony do amunicji przydatnej we współczesnym polskim magazynie broni. Zachowuje nazwy źródłowe, nazwy metryczne i imperialne oraz aliasy, a także dodaje praktyczne polskie i handlowe warianty.

Preset zawiera 108 kalibrów i 320 wariantów aliasów. Po normalizacji do bazy trafia 235 unikalnych kluczy wyszukiwania. Normalizacja ignoruje wielkość liter, spacje, początkową kropkę oraz różnicę `x`/`×`; dzięki temu wpisanie jednego znaku natychmiast filtruje sensowne warianty bez duplikowania formatów w UI.

## Wyłączenia historyczne

Z inicjalnego słownika świadomie wykluczono 15 pozycji uznanych za bardzo historyczne lub nieprzydatne jako domyślny zestaw: `22 Extra Long`, `300 Sherwood`, `303 Savage`, `30-40 Krag`, `32 Long Colt`, `380 Long`, `38 Long Colt`, `38 Short Colt`, `41 Long Colt`, `44 Colt`, `6,5 x 52 Carcano`, `7,5 x 54 MAS`, `7,92 x 33 kurz`, `8 mm Gasser` i `9 mm Browning long`.

Nie oznacza to zakazu użycia tych kalibrów. Administrator może dodać potrzebną pozycję ręcznie. Decyzja dotyczy wyłącznie czystej instalacji.

## Regenerowanie

```bash
node scripts/generate-caliber-preset.mjs /ścieżka/do/armted-historical-taxonomies-3.json data/calibers.modern.json
npm run db:seed
```

Generator rozdziela kalibry, które mogą mieć podobne wymiary, lecz nie powinny być traktowane jako identyczne (np. `.308 Winchester` i `7,62×51 mm NATO`). Administrator może dezaktywować pozycję bez naruszania historycznych powiązań.

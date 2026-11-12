# Tasks

## 1. Zutatenzeilen und Absätze

- [x] 1.1 `lib/recipeLines.ts` teilt Zutaten an Semikolons ausserhalb von Klammern, lässt leere Stücke weg und setzt die Menge links. Eine führende Zahl mit optionalem Dezimalkomma steht links. Das nächste Wort geht nur mit, wenn es in der Einheitenliste aus `design.md` steht, inklusive Plural auf `n` oder `en`. Sonst bleibt es beim Namen. Keine Umrechnung. Prüfen mit `lib/__tests__/recipeLines.test.ts`: `50 g Haferflocken; 200 ml Milch` wird zwei Zeilen, `2 Scheiben Toast (Croutons; gewürfelt); 2 Eier` behält das Semikolon in der Klammer und setzt `2` vor `Eier`, `0,5 TL Dijon-Senf (2,5 g)` bleibt `0,5 TL` links, `2 große Zwiebeln` setzt nur `2` links, `Salz` ist eine Rohzeile, `50 g Haferflocken;` erzeugt keine leere Zeile.
- [x] 1.2 Dieselbe Datei schneidet die Anleitung an Zeilenumbrüchen und verwirft leere Zeilen. Ohne Umbruch bleibt ein Absatz. Punkte werden nicht zu Schritten. Prüfen im selben Test: `Hafer kochen. Banane darauf.` ist ein Absatz, `Hähnchen anbraten.\nReis kochen.` sind zwei Absätze in dieser Reihenfolge.

## 2. Hero-Farbe

- [x] 2.1 Die Kachelpalette aus `screens/FoodScreen.tsx` wird eine gemeinsame Funktion der Rezept-ID. Dieselbe ID liefert immer dieselbe Farbe. Die Kachel weiter am Listenindex färben, nicht an der ID. Prüfen mit einem Test, dass zwei Aufrufe derselben ID gleich sind und der Kacheltest in `screens/__tests__/foodTab.test.tsx` weiter grün ist.

## 3. Kochkarte

- [x] 3.1 Der Buchzweig in `screens/RecipeScreen.tsx` zeigt Hero, Milchglasleiste mit Namen, eine Makrozeile aus `kcal`, `protein`, `kohlenhydrate` und `fett`, die Zutatenzeilen und die Absätze. Foto über `bookPhoto`, sonst der Farbblock aus 2.1. `Screen` mit `scroll={false}`, Karte im eigenen `ScrollView`, `Eaten` oder `Undo` darunter. `toggleEaten` bleibt. Der Entwurf-Zweig behält die Felder `Name`, `Ingredients`, `Instructions` und `Video`. Prüfen in `screens/__tests__/foodTab.test.tsx`: Haferporridge zeigt `Haferflocken`, `Milch`, `400`, `20`, `50`, `10` und `Hafer kochen.` ohne den zusammengeklebten Semikolon-String. Der Plan-Eintrag zeigt `Hähnchenbrust` und `Reis kochen.`, `Eaten` und nach `Back` wieder den Plan. `Eaten` schaltet weiter auf `Undo` und zurück. Ein fehlendes Buch zeigt weiter den Fehler und kein erfundenes Gericht. Der Entwurf zeigt weiter das Video-Feld sofort, und Confirm speichert den Link.
- [x] 3.2 Video im Buchzweig: `Open video` nur bei `http` oder `https`. Ohne Link heisst die Nebenaktion `Add video`, mit Link `Edit video`. Feld und `Save video` erst nach dieser Aktion. Speichern bleibt `saveRecipeVideo`. Prüfen im Food-Tab-Test: ohne Link kein Video-Feld und kein `Open video`, nach `Add video` erscheint das Feld, ein gespeicherter `https`-Link zeigt `Open video`.

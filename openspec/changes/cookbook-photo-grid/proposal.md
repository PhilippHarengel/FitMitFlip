# Proposal

## Why

Das Kochbuch im Food-Tab listet Buchgerichte und Entwürfe als Textzeilen. Die Demo `cookbook-demo.html` zeigt dieselben Gerichte als zweispaltiges Raster aus quadratischen Kacheln, Name oben und Bild darunter. Diese Ansicht soll die Liste ersetzen, ohne den Datenfluss oder den Rezept-Screen zu ändern.

## What Changes

- Der Cookbook-Bereich wird ein senkrecht scrollendes Raster mit zwei Spalten. Jede Kachel ist quadratisch: Gerichtsname oben, Foto darunter. Tippen öffnet den bestehenden RecipeScreen.
- Jedes Gericht aus dem Rezeptbuch bekommt ein Foto. Ob das Foto über den Namen oder über die Rezept-ID hängt, ist offen.
- Die vier Beispieldateien `images/bandnudeln.jpg`, `images/caesar.jpg`, `images/tortilla.jpg` und `images/sandwichtoast.jpg` sind nicht der Katalog und werden gelöscht.
- Entwürfe bleiben lokal und aus dem Plan draussen. Sie erscheinen als eigene Pod-Sektion unter dem Buch-Raster, erreichbar durch Scrollen. `New draft` bleibt.
- Die Segment-Beschriftungen bleiben Englisch: `Cookbook`, `Plan`, `List`. Plan, List, RecipeScreen und der Worker-Abruf `rezepte` bleiben im Verhalten gleich.
- Schlägt das Laden des Buchs fehl, zeigt der Bereich den Fehler und kein erfundenes Raster.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `cookbook`: Die Namensliste in `openspec/specs/cookbook` wird zum Foto-Raster. Jedes Buchgericht bekommt ein Foto; der Schlüssel Name oder Rezept-ID bleibt offen. Die vier Beispielbilder sind kein Katalog. Entwürfe werden eine eigene Pod-Sektion unter dem Buch. `food-tab` bleibt unverändert, die Labels sind schon `Cookbook`, `Plan`, `List`.

## Impact

- App: die lokale Funktion `Cookbook` in `screens/FoodScreen.tsx`. Navigation zum RecipeScreen, `loadCookbook` und die Entwurf-Abfragen in `db/queries.ts` bleiben die Quelle.
- Dateien: die vier Beispielbilder unter `images/` fallen weg. `cookbook-demo.html` bleibt die visuelle Referenz, nicht der Laufzeitpfad.
- Kein neuer Worker-Vertrag, solange der Foto-Schlüssel nicht entschieden ist. RecipeScreen, Plan und List ändern ihr Verhalten nicht.

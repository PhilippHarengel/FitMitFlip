# Proposal

## Why

Vier Gerichte haben schon Fotos. Der Rest des Rezeptbuchs zeigt weiter Farbblöcke. Die Fotos sollen im selben rustikalen Look entstehen und in der App über die Rezept-ID hängen, nicht über den Namen.

## What Changes

- Für jedes übrige Buchgericht ein Foto im Look aus `cookbook-photo-prompts.md`. Rezepte mit Quellen-URL nutzen diese als Bildreferenz.
- Die vier vorhandenen Dateien bleiben. Neue Dateien liegen daneben in `images/`.
- Beim Laden des Kochbuchs hängt die App jedes Foto an `book:<id>` der geladenen Rezept-ID. Die Kachel liest weiter nur diesen Schlüssel.
- Entwürfe ohne eigenes Foto bleiben Farbblöcke. `draft:<id>` bleibt der Schlüssel, falls später ein Foto liegt.
- `cookbook-demo.html` bleibt die Stilreferenz und wird nicht zum Laufzeitpfad der App.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `cookbook`: Jedes Buchgericht mit hinterlegtem Foto zeigt es über `book:<id>`. Die ID-Regel aus `cookbook-recipe-ids` gilt weiter. Dieser Change füllt die Fotos.

## Impact

- Neue JPEGs unter `images/`.
- `lib/recipePhotos.ts` registriert die Dateien, sobald das Buch geladen ist, unter der ID aus `loadCookbook`.
- `screens/FoodScreen.tsx` ruft diese Registrierung nach dem Laden auf.

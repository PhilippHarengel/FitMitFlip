# Proposal

## Why

`cookbook-photo-grid` lässt offen, ob ein Foto am Namen oder an der Rezept-ID hängt. Namen sind nicht eindeutig. Dieselbe Speise kann zweimal im Buch stehen. Das Foto soll an der ID hängen, damit zwei Gerichte mit demselben Namen nicht dasselbe Bild teilen.

## What Changes

- Der Foto-Schlüssel ist die Rezept-ID, nicht der Name.
- Buchgerichte nutzen die ID, die `loadCookbook` schon liefert. Entwürfe nutzen die bestehende Zeilen-ID in `recipe_drafts`. Es kommt keine zweite ID-Spalte dazu.
- Der Schlüssel ist namensraumgetrennt: `book:<id>` und `draft:<id>`, damit eine Entwurfsnummer nie ein Buchgericht trifft.
- Ein Foto wird nur über diesen Schlüssel gehängt. Gleicher Name, andere ID, anderes Foto. Fehlt die ID oder das Foto, bleibt der Farbblock.
- Das Raster, die Entwurf-Sektion darunter und die englischen Labels `Cookbook`, `Plan`, `List` bleiben wie in `cookbook-photo-grid`.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `cookbook`: Fotos hängen an der bestehenden Rezept-ID. Der Haupt-Spec `openspec/specs/cookbook` hat die Foto-Anforderung aus `cookbook-photo-grid` noch nicht, weil dieser Change nicht archiviert ist. Dieses Delta ergänzt die ID-Regel als neue Anforderung.

## Impact

- App: die Kachel in `screens/FoodScreen.tsx` sucht das Foto über die ID. `CookbookRecipe.id` und `recipe_drafts.id` bleiben die Quelle.
- Kein neuer Worker-Vertrag. Fehlt die ID in einer Buchzeile, gibt es für diese Kachel kein Foto.
- `cookbook-photo-grid` bleibt der Raster-Change. Dieser Change entscheidet nur den Schlüssel.

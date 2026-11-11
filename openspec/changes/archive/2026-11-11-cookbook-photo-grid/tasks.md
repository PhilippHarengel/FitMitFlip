# Tasks

## 1. Raster

- [x] 1.1 `Cookbook` in `screens/FoodScreen.tsx` zeigt die Buchgerichte als zwei Spalten quadratischer Kacheln, Name oben, Fotofläche darunter, senkrecht scrollbar. Tippen übergibt weiter `recipeId` an `Recipe`. Prüfen mit dem Render-Test in `screens/__tests__/foodTab.test.tsx`, dass die Namensliste weg ist, die Kacheln die geladenen Namen zeigen und Suche, Scanner und Tageslog fehlen.
- [x] 1.2 Entwürfe stehen als eigene Pod-Sektion unter dem Buch-Raster, als Entwurf markiert. `New draft` öffnet weiter `{ draftId: 'new' }`, ein Entwurf `{ draftId }`. Prüfen im selben Test, dass ein Entwurf nicht zwischen den Buch-Kacheln steht und die Aktion erreichbar bleibt.

## 2. Fotos

- [x] 2.1 Ohne zugeordnetes Foto zeigt die Buch-Kachel den Farbblock und kein Bild. Die vier Beispieldateien werden nicht eingebunden. Prüfen, dass der Cookbook-Code `images/bandnudeln.jpg`, `images/caesar.jpg`, `images/tortilla.jpg` und `images/sandwichtoast.jpg` nicht referenziert.
- [x] 2.2 Die vier Beispieldateien löschen. Prüfen, dass `images/` diese Dateien nicht mehr enthält.

## 3. Chrome

- [x] 3.1 Die Segment-Beschriftungen bleiben `Cookbook`, `Plan` und `List`. Prüfen am bestehenden Test auf diese drei Texte.

## Workflow follow-up

- `food-shopping-list` ist archiviert. `openspec/specs/cookbook` ist das Ziel der `MODIFIED`-Anforderungen.
- Diesen Change archivieren, wenn die Tasks erledigt sind, und das Archiv prüfen.
- Der Foto-Schlüssel ist in `cookbook-recipe-ids` entschieden. Die Dateien hängen in `cookbook-remaining-photos`.

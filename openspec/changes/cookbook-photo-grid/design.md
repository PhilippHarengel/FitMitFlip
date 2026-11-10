# Design

## Context

Siehe `proposal.md` für den Anlass. `Cookbook` in `screens/FoodScreen.tsx` rendert zwei `ListSection`: Buchnamen und Entwürfe plus `New draft`. Tippen navigiert nach `Recipe`. Die Daten kommen aus `loadCookbook` (`action: rezepte`) und den Entwurf-Abfragen. `CookbookRecipe` hat keine Foto-Felder. Der Vertrag steht in `openspec/specs/cookbook`, archiviert aus `food-shopping-list`. Dieses Delta ändert die Namensliste und die Lage der Entwürfe.

Die visuelle Referenz ist `cookbook-demo.html`: zwei Spalten, quadratische Kachel, Name oben (höchstens zwei Zeilen), Bildfläche darunter, Eckenradius und leichter Schatten, senkrechter Scroll, Farbfläche wenn kein Bild da ist. Die Demo öffnet eine eigene Detailansicht. Die App öffnet weiter `RecipeScreen`.

## Goals / Non-Goals

**Goals:**

- Buchgerichte und Entwürfe als Pod-Raster, Entwürfe darunter.
- Jede Buch-Kachel hat eine Fotofläche. Zugeordnetes Foto oder Farbblock.
- Die vier Dateien unter `images/` löschen und nicht einbinden.
- Segment-Labels `Cookbook`, `Plan`, `List` unverändert lassen.

**Non-Goals:**

- RecipeScreen, Plan, List, Eaten/Undo oder den Worker-Vertrag ändern.
- Den Foto-Schlüssel (Name oder Rezept-ID) in diesem Entwurf festlegen.
- Die Demo-HTML zur Laufzeit der App machen.
- Beschriftungen auf Deutsch umstellen.

## Decisions

### Raster statt Listen

`Cookbook` ersetzt die beiden Listen durch zwei Raster derselben Kachel. Oben die Buchgerichte, darunter die Entwürfe. Eine Seite scrollt. `New draft` sitzt an der Entwurf-Sektion. Eine Buch-Kachel ruft `navigation.navigate('Recipe', { recipeId })` auf, ein Entwurf `{ draftId }`, `New draft` `{ draftId: 'new' }`.

Alternative, die Demo-Detailansicht in die App zu übernehmen: verworfen. Der Rezept-Screen existiert und die Spec lässt ihn.

### Fotofläche ohne Schlüssel

Jede Buch-Kachel reserviert die untere Fläche für ein Foto. Gibt es keine Zuordnung, füllt der Farbblock aus der Demo diese Fläche. Entwürfe haben kein Buch-Foto; ihre Fläche ist der Farbblock, der Name trägt die Entwurf-Markierung.

Die vier JPEGs werden gelöscht. Sie werden nicht per `require` an die ersten vier Namen gebunden.

Alternative, die Dateien per exaktem Namen einzublenden: verworfen. Philipp hat den Schlüssel offen gelassen und die Beispiele zum Löschen bestimmt.

### Chrome bleibt

Die Segment-Steuerung in `FoodScreen` bleibt `Cookbook`, `Plan`, `List`. Der Demo-Titel `Kochbuch` wird nicht übernommen. `food-tab` bekommt kein Delta.

## Risks / Trade-offs

- [Foto-Schlüssel offen] → Raster, Entwurf-Sektion und Löschen der Beispiele sind davon unabhängig. Echte Fotos warten auf Name oder Rezept-ID.
- [Alle Kacheln sind bis dahin Farbblöcke] → entspricht der Entscheidung, die Beispiele nicht als Katalog zu nutzen.
- [Name als späterer Schlüssel trifft mehrere Gerichte] → erst entscheiden, wenn der Schlüssel gewählt ist. Nicht raten.

## Migration Plan

1. Raster in `Cookbook` einbauen, Navigation und Ladewege lassen.
2. Die vier Dateien in `images/` löschen.
3. Rollback stellt die beiden Listen wieder her. Die gelöschten Beispiele müssen nicht zurück.

## Open Questions

Wie ein Foto einem Buchgericht zugeordnet wird, Name oder Rezept-ID. Das ändert den Vertrag nicht für das Raster und die Entwurf-Sektion. Es ändert nur die spätere Bindung der Dateien.

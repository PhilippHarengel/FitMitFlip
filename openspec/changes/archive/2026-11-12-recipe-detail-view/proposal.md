# Proposal

## Why

Ein Buchgericht im Food-Tab öffnet einen Rezept-Screen, der nur die Überschrift und zwei Rohtexte zeigt. Foto, Makros und die schon mit Semikolon getrennten Zutaten liegen am Gericht und bleiben unsichtbar. Kochen von der Kachel aus ist damit schlechter lesbar als das Raster davor.

## What Changes

- Der Rezept-Screen eines Buchgerichts wird eine Kochkarte: Hero mit Foto oder Farbblock, Name in einer Milchglasleiste auf dem Hero, eine Makrozeile (kcal, Protein, Kohlenhydrate, Fett), Zutaten als Zeilen, Zubereitung, Video im scrollenden Inhalt, `Eaten` unten fest.
- Zutaten werden an Semikolons ausserhalb von Klammern geteilt. Menge steht links, Lebensmittel rechts. Ein Stück, das sich nicht teilen lässt, bleibt eine Rohzeile. Semikolons in Klammern zerteilen die Zeile nicht, dieselbe Klammerregel wie bei der Einkaufsliste. Die Einkaufsliste selbst ändert sich nicht, und Notizen bleiben auf der Karte sichtbar.
- Die Zubereitung ist ein Absatz. Enthält der Buchtext Zeilenumbrüche, bleiben diese Zeilen in ihrer Reihenfolge eigene Absätze. Punkte werden nicht zu Schritten zerschnitten.
- Ein gespeicherter `http`- oder `https`-Link zeigt `Open video`. Link hinzufügen oder ändern ist eine kleine Nebenaktion. Der Link bleibt lokal auf dem Telefon.
- `Eaten` und `Undo` behalten ihr bisheriges Verhalten und sitzen fest am unteren Rand.
- Der Entwurf-Editor bleibt das Formular. Die HTML-Demo-Detailansicht und ein Schritt-für-Schritt-Kochmodus werden nicht gebaut.
- Ein Gericht aus dem Plan öffnet denselben Screen und damit dieselbe Karte.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `cookbook`: `Rezept öffnen` wird die Kochkarte. Die Kachel öffnet diese Karte statt des Rohtextes. Entwurf anlegen, ändern und löschen bleiben. `Heute gegessen` bleibt in der Wirkung und wird nur in der Lage des Knopfes gebunden. `food-tab` und `shopping-plan` bleiben, weil Plan denselben Screen nutzt und die Einkaufsliste ihre Zutatenregeln behält.

## Impact

- App: die Buchansicht in `screens/RecipeScreen.tsx`. Entwurf-Modus (`draftId`) bleibt. `FoodScreen` navigiert weiter nach `Recipe`. `bookPhoto` bleibt die Fotoquelle.
- Tests: `screens/__tests__/foodTab.test.tsx` erwartet heute den Zutaten-Rohstring mit Semikolon. Die Karte zeigt die Zeilen einzeln.
- Kein neuer Worker-Vertrag. `loadCookbook` und die Aktionsnamen bleiben. Video und `Eaten` schreiben weiter nur lokal.

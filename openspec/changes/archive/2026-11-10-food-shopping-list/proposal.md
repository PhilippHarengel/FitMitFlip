# Proposal

## Why

Der Food-Tab erfasst einzelne Lebensmittel. Der Einkauf für die nächsten Tage hängt an Telegram, Make und Notion und ist auf dem Telefon nicht benutzbar. Das Kochbuch, aus dem dieser Einkauf entsteht, liegt fertig im Notion-Rezeptbuch.

## What Changes

- **BREAKING**: Der Food-Tab verliert Suche, Barcode-Scanner, manuelles Eintragen, Meal-Presets und die Tageslog-Liste. Die Oberfläche wird Kochbuch und Plan.
- Der Plan erzeugt eine Einkaufsliste aus Gerichten des Notion-Rezeptbuchs. Ein Formular schickt Tage, Ausfälle, Hinweis und den letzten Plan an den Worker. Der Worker liest das Rezeptbuch, lässt das LLM Gerichte wählen und prüft die Antwort, bevor die App Tage und Liste zeigt.
- EL, Knoblauchzehen und Selleriestangen gehen mit festen Werten je Lebensmittel in die Summe. Vorrat bleibt draussen. Zeilen ohne hinterlegten Wert bleiben als nicht lesbar sichtbar.
- Ein Rezept kann als heute gegessen markiert werden. Die Portionsmakros schreiben weiter in `food_log`, damit die Ringe auf Home stimmen. Zurücknehmen passiert am Rezept, nicht über eine Log-Liste.
- Ein Entwurf auf dem Telefon landet nicht im Plan, solange er nicht im Notion-Rezeptbuch steht.
- Make und Telegram ruft die App nicht auf. Ein Plan aus der App ersetzt den Telegram-Plan, damit kein zweiter LLM-Call entsteht.
- Grundfunktionen Cookbook: Liste aus dem Rezeptbuch, Entwürfe darunter, Rezept mit Zutaten und Anleitung, eine Portion pro Rezept und Tag mit Umschalten auf Undo, Entwurf anlegen, ändern und löschen.
- Grundfunktionen Plan: Tage standard 7 ab morgen, Schalter für Start heute, Ausfälle als Wochentag plus Mahlzeit zum Hinzufügen und Entfernen, freier Hinweis. Die Einkaufsliste ist der Hauptinhalt, die Tage mit Kochen oder Rest stehen dabei. Tippen auf ein Gericht öffnet dasselbe Rezept. Ein Fehlschlag zeigt den Grund und lässt den letzten gültigen Plan stehen.
- Chrome bleibt Englisch, Buchinhalte bleiben in der Sprache des Rezeptbuchs. Teilen und eine Suche im Kochbuch gehören nicht dazu. Einkaufszeilen lassen sich abhaken.

## Capabilities

### New Capabilities

- `food-tab`: Food-Tab mit Kochbuch und Plan, ohne die bisherige Erfassungsoberfläche.
- `cookbook`: Rezepte aus dem Notion-Rezeptbuch lesen, öffnen, heute essen und lokale Entwürfe halten.
- `shopping-plan`: Fenster planen, Gerichte nur aus dem Rezeptbuch wählen, Einkaufsliste mit den festen Einheitenwerten liefern.

### Modified Capabilities

Keine. Das Projekt hat noch keine Specs.

## Impact

- App: `screens/FoodScreen.tsx` wird ersetzt. `screens/HomeScreen.tsx` behält die Tagessummen und ändert den Leer-Hinweis, der heute in den Food-Tab schickt. `food_log` bleibt die Quelle der Home-Ringe.
- Worker im Repo `essen-einkauf-wochenplan`: neue Action, die Notion-Rezeptbuch liest, Gemini aufruft und das geprüfte JSON zurückgibt. Der Gemini-Key liegt am Worker. Die App spricht den Worker mit dem bestehenden Webhook-Secret an.
- Notion-Rezeptbuch (`3f8898fd-b217-807f-bd41-ec36abf80da0`) ist die Quelle der Gerichte. Draft-Rezeptbuch und Make-Scenario bleiben aus dem App-Pfad.
- OpenFoodFacts und die Kamera haben im Food-Tab keinen Einstieg mehr. Die Tabellen `foods` und `meals` bleiben in SQLite, ohne Oberfläche.

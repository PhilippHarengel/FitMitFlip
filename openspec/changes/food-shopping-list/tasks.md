# Tasks

## 1. Einheiten im Worker

Repo: `essen-einkauf-wochenplan`.

- [x] 1.1 Zehe, Stange und EL vor der Summe umrechnen. Klammern abtrennen, `Zehen` und `Stangen` akzeptieren, Vorrat vorher verwerfen, `g` und `ml` unverändert lassen. Prüfen mit den Worker-Tests: 2 Zehen Knoblauch plus 2 g Knoblauch ergeben 10 g, 1,5 Stangen Sellerie ergeben 75 g, die EL-Tabelle aus `design.md` trifft Mehl, Sesam, Teriyaki, neutrales Öl, Reisessig und Olivenöl, ein unbekannter EL bleibt nicht lesbar und fehlt in der Summe, ein EL-Vorrat fehlt ganz.

## 2. App-Actions im Worker

- [x] 2.1 Action `rezepte` liest nur das Notion-Rezeptbuch und liefert Name, Mahlzeiten, Kategorien, Zutaten, Anleitung und Makros. Prüfen mit einem Fixture, dass ein Entwurf nicht in der Antwort steht und ein fehlgeschlagener Abruf einen Fehler ohne erfundene Liste liefert.
- [x] 2.2 Action `planen` baut `userText` aus Tageszahl, Schalter Start heute, Ausfällen und Hinweis. Standard ist 7 Tage ab morgen. Nur der Schalter setzt `ab heute`. Historie ist der letzte erfolgreiche Plan. Die Action ruft Katalog, Gemini und `plan` auf und gibt Tage, Koch- oder Rest-Markierung, Einkauf, nicht lesbare Zeilen und Summen zurück. Prüfen mit gemocktem Gemini: gültiger Plan, grosse Mahlzeit an zwei Mittagen als ein Kochvorgang mit Faktor zwei, Schalter aus lässt `ab heute` weg, Schalter an setzt es, falscher Slot und unbekannte ID liefern den Grund ohne neue Liste. Die Actions `katalog` und `plan` bleiben für Make unverändert, bestehender Testlauf bleibt grün.

## 3. Lokale Daten in der App

- [x] 3.1 Migration für `food_log.recipe_id`, `recipe_drafts` und `shopping_plans` anhängen. Prüfen, dass ein bestehendes Datenbankschema die neuen Statements ausführt und alte Log-Zeilen ohne `recipe_id` lesbar bleiben.
- [x] 3.2 Portion speichern und zurücknehmen. Die Portionsmakros liegen als Werte je 100 g, der Eintrag hat `serving_g` 100 und die Rezept-ID, das Datum ist heute. Ein zweites Speichern desselben Rezepts am selben Tag legt keine weitere Zeile an. Zurücknehmen löscht nur die heutigen Zeilen dieser Rezept-ID. Prüfen mit einem Test, dass die Home-Summe genau die Portion enthält, ein zweiter Aufruf die Summe nicht verdoppelt und Zurücknehmen sie entfernt.
- [x] 3.3 Entwürfe anlegen, ändern, löschen und den letzten erfolgreichen Plan speichern. Ein Fehlschlag überschreibt den Plan nicht. Prüfen, dass ein Entwurf nicht im Payload der Plananfrage steht, die Rezeptnamen des letzten Plans als zuletzt gegessen mitgehen und ein Fehler-Response die gespeicherte Zeile lässt.

## 4. Food-Tab

- [x] 4.1 `FoodScreen` durch die Bereiche `Cookbook` und `Plan` ersetzen, ohne Datumsschieber, Suche, Scanner, manuelles Formular, Meals und Tageslog. Der gewählte Bereich bleibt beim Zurückkommen aus dem Rezept. Prüfen mit einem Render-Test, dass diese Einstiege fehlen, die englischen Beschriftungen stehen und beide Bereiche erreichbar sind.
- [x] 4.2 Rezeptansicht mit Zutaten, Anleitung, `Eaten` und `Undo`. Bei nicht erreichbarem Buch einen Fehler ohne erfundene Liste zeigen. Tippen auf ein Gericht im Plan öffnet denselben Screen. Prüfen mit Fixture-Daten, einem fehlgeschlagenen Abruf und dem Öffnen aus dem Plan.
- [x] 4.3 Planformular: Tageszahl Standard 7, Schalter `Start today` aus, Ausfälle hinzufügen und entfernen, Hinweis. Ergebnis: Einkaufsliste nach Kategorie als Hauptinhalt, Tage mit `Cook` oder `Leftover`, nicht lesbare Zeilen. Fehlschlag zeigt den Grund und lässt den letzten Plan stehen. Prüfen mit Fixture-Erfolg, Fixture-Fehler ohne gespeicherten Plan und Fixture-Fehler mit gespeichertem Plan.
- [x] 4.4 Entwürfe im Cookbook anlegen, als Entwurf markieren, ändern und löschen. Prüfen, dass Anlegen und Ändern in der Liste landen, Löschen den Eintrag entfernt und die Plan-Fixture ihn nicht enthält.
- [x] 4.5 Home-Leerhinweis auf `Open the cookbook` ändern. `Log your first meal` entfällt. Datumsschieber und Summen bleiben. Prüfen am Hinweistext und daran, dass die Summen weiter aus den Tageseinträgen kommen.

## 5. Zusammenspiel

- [x] 5.1 App-Client gegen die JSON-Form von `rezepte` und `planen` prüfen, inklusive Fehler ohne Liste. Der Client sendet das Webhook-Secret und kein Rezeptbuch. Prüfen mit einem Contract-Test auf Erfolg und auf Grund-ohne-Liste.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.

# Design

## Context

Siehe `proposal.md` für den Anlass. Der Worker in `essen-einkauf-wochenplan` kann heute `katalog` und `plan`. Make liest Notion, ruft Gemini und schickt das Roh-JSON an `plan`. `plan` prüft Slots und summiert Zutaten, liefert aber Text. Einheiten ausser `g`, `ml`, `Stk`, `Scheibe`, `Zehe` und `Bund` werden nicht gelesen. `Zehen` scheitert am Singular `Zehe`.

Die App rechnet Tagessummen mit `serving_g / 100 * Nährwert_je_100g`. Der Food-Tab hat Datumsschieber, Suche, Scanner, Meals und Tageslog.

## Goals / Non-Goals

**Goals:**

- Eine Worker-Action, die das Rezeptbuch liest, Gemini ruft und einen geprüften Plan als JSON zurückgibt.
- Eine zweite Action, die das Kochbuch inklusive Anleitung liefert.
- Umrechnung von Zehe, Stange und EL vor der Summe, mit der festen Tabelle aus der Spec.
- Food-Tab aus Kochbuch und Plan. „Gegessen“ schreibt eine Portion so, dass die bestehende Home-Formel stimmt.

**Non-Goals:**

- Make-Scenario ändern oder abschalten.
- Drafts nach Notion schreiben oder ihre Nährwerte berechnen.
- Tabellen `foods` und `meals` löschen.
- OpenFoodFacts aus dem Repo entfernen.
- Ein öffentliches Auth-Verfahren ausser dem bestehenden Webhook-Secret.
- Teilen und eine Suche im Cookbook gehören nicht dazu. Einkaufszeilen lassen sich abhaken.

## Decisions

### Worker orchestriert, die App nicht

Neue Action `planen`. Sie liest das Notion-Rezeptbuch, baut aus dem Formular den deutschen `userText`, den `expectedDays` und `startsToday` schon verstehen, hängt den letzten erfolgreichen Plan als Historie an, ruft `katalog`, dann Gemini `gemini-3.5-flash-lite`, dann `plan`. Zurück kommt JSON, kein Telegram-Text.

`userText` entsteht so: `die nächsten N Tage`, N aus dem Zahlenfeld, Standard 7. Ist der Schalter für heute an, enthält der Text ausdrücklich `ab heute`, sonst nicht. Jeder Ausfall wird `Wochentag Mahlzeit fällt aus`. Der Hinweis wird angehängt, wenn er nicht leer ist. Der Schalter, nicht der Hinweis, entscheidet den Starttag.

Neue Action `rezepte`. Dieselben Notion-Seiten, zusätzlich Anleitung. Draft-Datenbank wird nicht gelesen.

Alternative, die App ruft Notion und Gemini selbst: Token und Key lägen im App-Binary. Verworfen.

Alternative, die App stösst Make an: die Spec verlangt einen Plan ohne Make-Lauf. Verworfen.

Bestehende Actions `katalog` und `plan` bleiben für Make unverändert.

### Geheimnisse

`NOTION_TOKEN` und `GEMINI_API_KEY` sind Worker-Secrets. Die App sendet nur `x-webhook-secret`, Tage, Ausfälle, Hinweis, Datum und den letzten Plan. Das Rezeptbuch geht nicht mit.

Das Webhook-Secret liegt in der privaten App. Es ist kein neues Login.

### Antwort von `planen`

Erfolg: Tage mit Datum, Wochentag und drei Slots. Jeder Slot hat Rezept-ID, Name oder ausgelassen, und bei einer grossen Mahlzeit `kochen` oder `rest`. Einkauf ist eine Liste aus Kategorie, Name, Menge, Einheit. Nicht lesbare Zeilen stehen separat. Dazu die Summen.

Misserfolg: Grund als Text, keine neue Liste. Das deckt ungültiges JSON, `fragen`, `keine_auswahl` und die Prüfungen in `plan` ab. Die App überschreibt `shopping_plans` nur bei Erfolg. Der letzte gültige Plan bleibt auf dem Screen.

### Einheiten

Die Umrechnung sitzt in der Zutatenzerlegung, bevor summiert wird. Klammern fallen vor dem Namensvergleich weg. `Zehen` gilt als `Zehe`, `Stangen` als `Stange`.

| Name | Eingabe | Ergebnis |
|---|---|---|
| Knoblauch | Zehe | 4 g |
| Sellerie | Stange | 50 g |
| Mehl | EL | 10 g |
| Sesamkörner | EL | 9 g |
| Honig | EL | 21 g |
| Tomatenmark | EL | 15 g |
| Sojasauce | EL | 15 ml |
| Teriyaki-Sauce | EL | 15 ml |
| neutrales Öl | EL | 14 g |
| Reisessig | EL | 15 ml |
| Olivenöl | EL | 15 ml |

Vorrat fehlt in der Summe und steht in der Prüfliste. `g` und `ml` bleiben. Ein EL ohne Tabellenzeile bleibt nicht lesbar. Kategorien folgen Supermarkt-Gängen: Obst und Gemüse, Brot und Backwaren, Kühlregal, Fleisch und Wurst, Fisch, Tiefkühl, Nudeln und Getreide, Konserven, Öle und Gewürze, Getränke, Haushalt, sonst `Sonstiges`. Zuordnung per Fuzzy-Match auf den Zutatennamen.

### Portion ins Tageslog

Migration hängt `recipe_id` an `food_log`. „Gegessen“ legt ein Lebensmittel an, dessen Werte je 100 g die Portionsmakros sind, und einen Log-Eintrag mit `serving_g = 100` und der Rezept-ID. Die Home-Formel `(serving_g / 100) * je_100g` ergibt dann genau eine Portion. Zurücknehmen löscht die Log-Zeilen von heute mit dieser Rezept-ID.

Alternative ohne Migration, Rezept-ID im Namen: verworfen, Zurücknehmen träfe das falsche Gericht.

### Lokaler Zustand

`recipe_drafts` hält Name, Zutaten, Anleitung, einen Video-Link und ob der Entwurf bestätigt ist. Anlegen, Ändern, Bestätigen und Löschen bleiben auf dem Telefon. Drafts gehen in keine Worker-Anfrage und stehen im Cookbook unter den Buch-Gerichten. Unbestätigt heißen sie `Draft`, bestätigt `Confirmed`. Ein Link an einem Gericht aus dem Rezeptbuch liegt lokal in `recipe_videos` und geht nicht an den Worker.

`shopping_plans` hält die letzte erfolgreiche Antwort. Die App schickt die Rezeptnamen daraus als zuletzt gegessen. Die angezeigte Liste kommt aus dieser Zeile, nicht aus Notion-Historie.

Eine Portion pro Rezept und Tag. Der Knopf am Rezept heisst `Eaten`, solange heute keine Zeile mit dieser `recipe_id` existiert, sonst `Undo`. Ein zweites Tippen auf `Eaten` legt nichts an, weil der Knopf dann `Undo` ist.

### Oberfläche

```
FoodScreen
  Segment: Cookbook | Plan | List
  |
  +-- Cookbook
  |     Buchliste
  |     Entwürfe
  |     + New draft
  |
  +-- Plan
  |     Formular, Aktion New plan
  |
  +-- List
        gespeicherte Einkaufsliste, dann Tage
        ohne Liste: Hinweis
        Aktion New plan wechselt zu Plan, die Liste bleibt

RecipeScreen
  Name, Zutaten, Anleitung
  Eaten oder Undo
  Draft: Save, Delete
```

`FoodScreen` hat keinen `DateNavigator`. Cookbook und Plan sind der Einstieg, das Rezept ein Screen im Food-Stack. Beschriftungen der Chrome sind Englisch: `Cookbook`, `Plan`, `List`, `Eaten`, `Undo`, `New draft`, `New plan`. Namen, Zutaten, Anleitung und Einkaufszeilen bleiben der Text aus dem Buch. Home behält den Datumsschieber. Der Leer-Hinweis lautet `Open the cookbook`.

Formular auf Plan: Tageszahl frei eingebbar, Standard 7, daneben Schritte um eins. `Start today` ist ein Button, Standard aus. Darunter die Tage des Fensters von links nach rechts, kurzes englisches Wochentagskürzel und der Tag im Monat. Jeder Tag hat eigene Schalter für Frühstück, Mittagessen und Abendessen. Der erste Tipp auf einen Tag ohne Ausfall lässt an diesem Tag alle drei Mahlzeiten ausfallen. Ein weiterer Tipp auf einen Tag, an dem schon alle drei ausfallen, nimmt den ganzen Tag zurück. Ein Tipp auf eine Mahlzeit ändert nur diese Mahlzeit an diesem Tag. Ein Tag ohne gesetzte Mahlzeit hat keinen Ausfall. Die Anfrage bleibt `ausfaelle` aus `{ tag, mahlzeit }`. Kommt derselbe Wochentag im Fenster zweimal vor, geht er einmal in die Anfrage. Hinweis optional. Nach Erfolg zeigt Plan die Gerichte. An jedem Gericht kann der Nutzer `Like` oder `No` setzen. `No` hängt `Diese Gerichte gefallen nicht` an die nächste Anfrage. `Like` nimmt den Namen aus der Historie, damit das Gericht wieder vorgeschlagen werden kann. Die Einkaufsliste auf `List` lässt sich ändern. Eine Zeile öffnet Name, Menge und Einheit. `Add item` hängt eine Zeile an. `Remove` löscht eine bestehende Zeile. Die Änderung bleibt in `shopping_plans`.

## Risks / Trade-offs

- [Webhook-Secret in der App] → private Installation. Wer den Worker kennt und das Secret hat, kann Gemini verbrauchen.
- [Notion-Zutaten weichen von `Menge Einheit Name` ab] → Zeile unter nicht lesbar, Summe bleibt ehrlich.
- [EL-Name trifft die falsche Zeile, etwa Öl gegen Olivenöl] → Vergleich auf den ganzen Namen nach dem Abtrennen der Klammer, nicht auf ein Teilwort.
- [Telegram und App planen beide] → zwei Gemini-Calls. Die Spec geht davon aus, dass die App den Telegram-Plan ersetzt.
- [Worker liegt im Nachbar-Repo] → App-Vertrag und Worker-Action entstehen zusammen. Die App bleibt ohne Worker dunkel und zeigt den Fehler aus der Kochbuch-Spec.

## Migration Plan

1. Worker-Action und Tests deployen, Secrets setzen. Make bleibt auf `katalog` und `plan`.
2. App-Migration und neue Food-Oberfläche ausliefern.
3. Rollback der App stellt den bisherigen Food-Screen her. Die neuen Tabellen und `recipe_id` dürfen bleiben. Die Worker-Action kann ungenutzt weiterlaufen.

## Open Questions

Keine. Offene Punkte würden Spec oder Zuschnitt ändern und sind oben entschieden.

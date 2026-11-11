# cookbook Specification

## Purpose

Das Kochbuch zeigt die Gerichte aus dem Notion-Rezeptbuch, lässt eine Portion als heute gegessen speichern und hält Entwürfe vom Plan fern.

## Requirements

### Requirement: Rezeptliste kommt aus dem Rezeptbuch
Das Kochbuch SHALL die Gerichte des Rezeptbuchs als senkrecht scrollendes Raster mit zwei Spalten quadratischer Kacheln zeigen. Jede Kachel SHALL den Namen oben und darunter ein Foto oder einen Farbblock zeigen. Mahlzeiten und Kategorien stehen nicht auf der Hauptseite. Es SHALL Gerichte aus dem Draft-Rezeptbuch nicht in diesem Raster listen.

#### Scenario: Buch laden
- **WHEN** der Nutzer das Kochbuch öffnet und das Rezeptbuch erreichbar ist
- **THEN** sieht er die Gerichte des Rezeptbuchs als Kacheln und keines aus dem Draft-Rezeptbuch

#### Scenario: Buch nicht erreichbar
- **WHEN** der Nutzer das Kochbuch öffnet und das Rezeptbuch nicht erreichbar ist
- **THEN** sieht er einen Fehler und keine erfundene Liste

#### Scenario: Kachel öffnet das Rezept
- **WHEN** der Nutzer eine Buch-Kachel antippt
- **THEN** öffnet sich derselbe Rezept-Screen wie bisher, mit Name, Zutaten und Anleitung

### Requirement: Rezept öffnen
Ein geöffnetes Rezept SHALL Name, Zutaten und Anleitung aus dem Rezeptbuch zeigen.

#### Scenario: Rezept ansehen
- **WHEN** der Nutzer ein Gericht aus der Liste öffnet
- **THEN** sieht er Name, Zutaten und Anleitung dieses Gerichts

### Requirement: Heute gegessen
Der Nutzer SHALL ein Rezept als heute gegessen speichern. Das System SHALL die Portionsmakros dieses Rezepts als einen Tageseintrag für das heutige Datum schreiben. Pro Rezept und Tag SHALL höchstens eine Portion existieren. Ist sie gespeichert, SHALL der Knopf `Undo` heissen, sonst `Eaten`. Undo SHALL den Eintrag löschen.

#### Scenario: Portion speichern
- **WHEN** der Nutzer an einem Rezept `Eaten` wählt und heute noch keine Portion dieses Rezepts existiert
- **THEN** existiert für heute genau ein Tageseintrag mit den kcal, Protein, Kohlenhydraten und Fett dieses Rezepts und der Knopf heisst `Undo`

#### Scenario: Zweite Portion
- **WHEN** für dieses Rezept heute schon eine Portion existiert und der Nutzer den Knopf erneut sieht
- **THEN** legt das System keine zweite Portion an

#### Scenario: Portion zurücknehmen
- **WHEN** der Nutzer `Undo` an der heutigen Portion desselben Rezepts wählt
- **THEN** ist dieser Tageseintrag gelöscht, der Knopf heisst `Eaten` und die Home-Summe enthält die Portion nicht mehr

### Requirement: Entwurf bleibt lokal
Der Nutzer SHALL auf dem Telefon einen Rezeptentwurf mit Name, Zutaten und Anleitung anlegen. Ein Entwurf SHALL nicht in der Plan-Auswahl und nicht in der Einkaufsliste erscheinen. Entwürfe SHALL als eigene Pod-Sektion unter dem Buch-Raster stehen und durch Scrollen erreichbar sein.

#### Scenario: Entwurf anlegen
- **WHEN** der Nutzer einen Entwurf speichert
- **THEN** erscheint der Entwurf in der Pod-Sektion unter dem Buch-Raster, als Entwurf markiert, und fehlt in der Menge der planbaren Gerichte

### Requirement: Entwurf ändern und löschen
Der Nutzer SHALL Name, Zutaten, Anleitung und einen Video-Link eines eigenen Entwurfs ändern und den Entwurf löschen können. Ein Entwurf SHALL sich bestätigen lassen. Ein bestätigter Entwurf SHALL weiter bearbeitbar bleiben und SHALL weiter nicht in der Plan-Auswahl stehen.

#### Scenario: Video-Link
- **WHEN** der Nutzer an einem Entwurf einen Reel- oder Short-Link speichert
- **THEN** zeigt der Entwurf diesen Link

#### Scenario: Entwurf bestätigen
- **WHEN** der Nutzer einen Entwurf bestätigt
- **THEN** ist der Entwurf als bestätigt markiert und fehlt in der Plananfrage

#### Scenario: Entwurf ändern
- **WHEN** der Nutzer einen Entwurf speichert, nachdem er den Namen geändert hat
- **THEN** zeigt die Entwurfsliste den neuen Namen

#### Scenario: Entwurf löschen
- **WHEN** der Nutzer einen Entwurf löscht
- **THEN** fehlt der Entwurf im Cookbook und in jeder Plananfrage

### Requirement: Foto je Buchgericht
Jedes Gericht aus dem Rezeptbuch SHALL auf seiner Kachel ein Foto zeigen, sobald eines zugeordnet ist. Ohne Zuordnung SHALL die Kachel einen Farbblock zeigen. Die vier Beispieldateien SHALL nicht der Foto-Katalog sein.

#### Scenario: Zugeordnetes Foto
- **WHEN** für ein Buchgericht ein Foto zugeordnet ist und der Nutzer das Kochbuch öffnet
- **THEN** zeigt die Kachel dieses Foto unter dem Namen

#### Scenario: Kein Foto
- **WHEN** für ein Buchgericht kein Foto zugeordnet ist
- **THEN** zeigt die Kachel einen Farbblock und kein erfundenes Foto

#### Scenario: Beispielbilder sind kein Katalog
- **WHEN** der Nutzer das Kochbuch öffnet
- **THEN** stammen die Fotos nicht aus den vier Beispieldateien

### Requirement: Neuer Entwurf bleibt erreichbar
Die Entwurf-Sektion SHALL die Aktion `New draft` anbieten.

#### Scenario: Neuer Entwurf
- **WHEN** der Nutzer `New draft` wählt
- **THEN** öffnet sich der bestehende Entwurf-Editor

### Requirement: Foto hängt an der Rezept-ID
Ein Foto SHALL nur über die Rezept-ID hängen, nie über den Namen. Ein Buchgericht SHALL den Schlüssel `book:` plus seine bestehende ID verwenden. Ein Entwurf SHALL den Schlüssel `draft:` plus seine bestehende Zeilen-ID verwenden. Dieselbe ID SHALL immer dasselbe Foto treffen. Zwei Gerichte mit demselben Namen und verschiedener ID SHALL verschiedene Fotos haben können.

#### Scenario: Gleicher Name
- **WHEN** zwei Buchgerichte denselben Namen und verschiedene IDs haben und nur für eine ID ein Foto liegt
- **THEN** zeigt nur die Kachel dieser ID das Foto, die andere den Farbblock

#### Scenario: Entwurf und Buch
- **WHEN** ein Entwurf und ein Buchgericht dieselbe Roh-ID hätten
- **THEN** bleiben ihre Fotos getrennt, weil die Schlüssel `draft:` und `book:` verschieden sind

#### Scenario: Umbenennen
- **WHEN** ein Entwurf umbenannt wird und ein Foto an seiner ID liegt
- **THEN** zeigt die Kachel nach dem neuen Namen dasselbe Foto

### Requirement: Fehlende Zuordnung bleibt Farbblock
Fehlt die ID oder liegt für den Schlüssel kein Foto, SHALL die Kachel einen Farbblock zeigen und kein Foto über den Namen suchen.

#### Scenario: Buchzeile ohne ID
- **WHEN** ein Buchgericht ohne ID ankommt
- **THEN** zeigt die Kachel den Farbblock

#### Scenario: ID ohne Foto
- **WHEN** für eine vorhandene ID kein Foto liegt
- **THEN** zeigt die Kachel den Farbblock und kein Bild eines anderen Gerichts

### Requirement: Hinterlegte Fotos erscheinen über die Buch-ID
Liegt für ein Buchgericht eine Bilddatei, SHALL die App sie beim Laden an `book:` plus die ID aus dem Rezeptbuch hängen. Die Kachel SHALL das Foto nur über diesen Schlüssel zeigen. Der Name darf die Datei auswählen, aber nicht die angezeigte Kachel suchen. Ein Gericht ohne Datei SHALL den Farbblock behalten.

#### Scenario: Foto vorhanden
- **WHEN** das Rezeptbuch ein Gericht mit bekannter Bilddatei liefert
- **THEN** zeigt die Kachel dieses Gerichts das Foto, adressiert mit `book:` und der geladenen ID

#### Scenario: Kein Foto
- **WHEN** für ein geladenes Gericht keine Bilddatei liegt
- **THEN** zeigt die Kachel den Farbblock

#### Scenario: Gleicher Name
- **WHEN** zwei Gerichte denselben Namen und verschiedene IDs haben und nur eine Datei diesem Namen zugeordnet ist
- **THEN** erhält nur die erste Zuordnung das Foto, die Suche der Kachel bleibt die ID

# cookbook Specification

## Purpose

Das Kochbuch zeigt die Gerichte aus dem Notion-Rezeptbuch, lässt eine Portion als heute gegessen speichern und hält Entwürfe vom Plan fern.

## Requirements

### Requirement: Rezeptliste kommt aus dem Rezeptbuch
Das Kochbuch SHALL die Gerichte des Notion-Rezeptbuchs nur mit dem Namen listen. Mahlzeiten und Kategorien stehen nicht auf der Hauptseite. Es SHALL Gerichte aus dem Draft-Rezeptbuch nicht listen.

#### Scenario: Buch laden
- **WHEN** der Nutzer das Kochbuch öffnet und das Rezeptbuch erreichbar ist
- **THEN** sieht er die Gerichte des Rezeptbuchs und keines aus dem Draft-Rezeptbuch

#### Scenario: Buch nicht erreichbar
- **WHEN** der Nutzer das Kochbuch öffnet und das Rezeptbuch nicht erreichbar ist
- **THEN** sieht er einen Fehler und keine erfundene Liste

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
Der Nutzer SHALL auf dem Telefon einen Rezeptentwurf mit Name, Zutaten und Anleitung anlegen. Ein Entwurf SHALL nicht in der Plan-Auswahl und nicht in der Einkaufsliste erscheinen.

#### Scenario: Entwurf anlegen
- **WHEN** der Nutzer einen Entwurf speichert
- **THEN** erscheint der Entwurf im Cookbook unter den Entwürfen, als Entwurf markiert, und fehlt in der Menge der planbaren Gerichte

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

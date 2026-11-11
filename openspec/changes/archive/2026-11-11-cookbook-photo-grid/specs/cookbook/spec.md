# Spec Delta

## MODIFIED Requirements

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

### Requirement: Entwurf bleibt lokal
Der Nutzer SHALL auf dem Telefon einen Rezeptentwurf mit Name, Zutaten und Anleitung anlegen. Ein Entwurf SHALL nicht in der Plan-Auswahl und nicht in der Einkaufsliste erscheinen. Entwürfe SHALL als eigene Pod-Sektion unter dem Buch-Raster stehen und durch Scrollen erreichbar sein.

#### Scenario: Entwurf anlegen
- **WHEN** der Nutzer einen Entwurf speichert
- **THEN** erscheint der Entwurf in der Pod-Sektion unter dem Buch-Raster, als Entwurf markiert, und fehlt in der Menge der planbaren Gerichte

## ADDED Requirements

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

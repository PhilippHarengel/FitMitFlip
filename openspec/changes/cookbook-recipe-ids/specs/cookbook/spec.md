# Spec Delta

## ADDED Requirements

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

# Spec Delta

## ADDED Requirements

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

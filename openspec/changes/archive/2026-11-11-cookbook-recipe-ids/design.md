# Design

## Context

Siehe `proposal.md`. `CookbookRecipe` hat schon `id` aus `loadCookbook`. `recipe_drafts.id` ist `INTEGER PRIMARY KEY AUTOINCREMENT`. `cookbook-photo-grid` baut das Raster und lässt den Foto-Schlüssel offen. Die Kacheln zeigen heute den Farbblock, weil noch kein Foto zugeordnet ist.

## Goals / Non-Goals

**Goals:**

- Foto-Lookup nur über `book:<id>` oder `draft:<id>`.
- Gleicher Name teilt sich kein Foto.

**Non-Goals:**

- Eine zweite ID-Spalte. Beide Seiten haben schon eine ID.
- Den Worker, die Segment-Labels oder das Raster neu bauen.
- Die Bilddateien erzeugen. Dieser Change legt nur den Schlüssel fest. Ein leerer Speicher zeigt den Farbblock.

## Decisions

### Vorhandene IDs, kein neues Feld

Die Buch-ID bleibt das Feld `id` der Worker-Antwort. Die Entwurfs-ID bleibt der Primärschlüssel. Eine neue Spalte würde zwei Wahrheiten erzeugen.

Alternative, eine UUID zusätzlich zu speichern: verworfen. Die bestehenden IDs überleben Umbenennen und reichen als Schlüssel.

### Namensraum

`book:` und `draft:` stehen vor der Roh-ID. Eine Entwurfszeile `1` und ein Buchgericht, dessen ID zufällig `1` wäre, bleiben verschiedene Fotos.

Alternative, nur die Roh-ID: verworfen. Die Typen sind verschieden, Text gegen Zahl, und können sich kreuzen.

### Speicher

Ein lokales Verzeichnis oder eine Tabelle, adressiert mit dem vollen Schlüssel, nicht mit dem Namen. Die Kachel fragt diesen Schlüssel ab. Kein Treffer, Farbblock. Der Name wird nicht als Fallback gelesen.

## Risks / Trade-offs

- [Buchzeile ohne ID] → Farbblock, kein erfundenes Foto und kein Namensvergleich.
- [`cookbook-photo-grid` ist nicht archiviert] → dieses Delta ist nur `ADDED`, damit es den heutigen Haupt-Spec nicht als `MODIFIED` verfehlt. Die ID-Regel gilt neben der Foto-Anforderung des Raster-Changes.
- [Keine Bildbytes in diesem Change] → das Raster bleibt Farbblöcke, bis irgendwo Dateien unter den Schlüsseln liegen.

## Migration Plan

1. Schlüssel bilden und die Kachel danach suchen lassen.
2. Rollback entfernt die Suche. Die IDs in Buch und Entwurf bleiben.

## Open Questions

Keine zum Schlüssel. Woher die Bilddateien kommen, ist ein späterer Change und ändert diese Regel nicht.

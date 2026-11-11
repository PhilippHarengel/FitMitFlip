# Design

## Context

Siehe `proposal.md`. Die App bekommt von `rezepte` eine Notion-Seiten-ID, 32 Hexzeichen, nicht die YAML-Slug. `bookPhoto` sucht `book:<diese ID>`. Die Bilddateien sind nach Slug benannt. Die Zuordnung Datei → Name steht fest. Die ID entsteht erst beim Laden.

## Goals / Non-Goals

**Goals:**

- Jedes übrige Buchgericht bekommt eine JPEG im Look der vier vorhandenen Bilder.
- Nach `loadCookbook` hängt jede Datei an der geladenen ID.

**Non-Goals:**

- Notion-IDs im Repo hart codieren.
- Entwurfsfotos erzeugen.
- `cookbook-demo.html` zur App machen.

## Decisions

### Name nur beim Binden

`bindBookPhotos` läuft einmal nach dem Laden. Sie kennt Name und ID. Die Datei wird über den Namen gewählt und mit `setRecipePhoto(book:<id>)` gespeichert. Die Kachel ruft danach nur `bookPhoto(id)`. Zwei gleiche Namen: die erste Datei gewinnt, die zweite Kachel bleibt Farbblock, weil ein Name nur eine Datei hat.

Alternative, die Notion-ID in die Datei zu schreiben: die ID liegt nicht in der YAML. Verworfen.

### Quellen

Andy-Cooks-Seiten und der YouTube-Short zu Jägerschnitzel sind Bildreferenzen für die Erzeugung. Gerichte ohne URL folgen nur der Beschreibung und dem gemeinsamen Look.

## Risks / Trade-offs

- [Notion benennt ein Gericht um] → die Datei hängt nicht mehr. Der Farbblock bleibt.
- [Zwei Gerichte, ein Name] → nur eines bekommt das Foto.

## Migration Plan

1. JPEGs nach `images/` legen.
2. Bindung in `FoodScreen` nach erfolgreichem `loadCookbook`.
3. Rollback entfernt die Bindung. Die Dateien dürfen bleiben.

## Open Questions

Keine.

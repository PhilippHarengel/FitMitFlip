# Tasks

## 1. Bilder

- [x] 1.1 Für jedes übrige Buchgericht eine JPEG unter `images/` erzeugen, im Look von `cookbook-photo-prompts.md`. Quellen-URLs als Bildreferenz nutzen, wo sie existieren. Die vier vorhandenen Dateien nicht ersetzen. Prüfen, dass die neuen Dateien existieren und die vier alten Größen sich nicht ändern mussten.

## 2. Bindung

- [x] 2.1 Nach dem Laden des Buchs jede Bilddatei an `book:` plus die geladene ID hängen. Die Kachel liest nur diesen Schlüssel. Prüfen mit einem Test: zwei Rezepte heißen gleich, nur eines hat eine Datei, nur dessen ID zeigt das Foto. Ein unbekannter Name bleibt Farbblock.

## Workflow follow-up

- `cookbook-recipe-ids` sollte vor diesem Change archiviert werden, weil die ID-Schlüssel dort definiert sind.

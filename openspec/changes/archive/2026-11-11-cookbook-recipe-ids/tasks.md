# Tasks

## 1. Schlüssel

- [x] 1.1 Eine Funktion bildet `book:<id>` aus der Buch-ID und `draft:<id>` aus der Entwurfs-ID. Prüfen mit einem Test, dass dieselbe Roh-ID in beiden Namensräumen zwei verschiedene Schlüssel ergibt und ein leerer Buch-`id` keinen Schlüssel ergibt.

## 2. Kachel

- [x] 2.1 Die Buch-Kachel und die Entwurf-Kachel laden das Foto nur über diesen Schlüssel. Ein Treffer zeigt das Bild, sonst den Farbblock. Der Name wird nicht gelesen. Prüfen mit einem Render-Test: zwei Gerichte heißen gleich, nur eine ID hat ein Foto, nur diese Kachel zeigt es.
- [x] 2.2 Ein umbenannter Entwurf behält das Foto seiner ID. Prüfen, dass nach der Namensänderung dieselbe Kachel das Foto zeigt.

## Workflow follow-up

- `cookbook-photo-grid` archivieren, bevor dieser Change archiviert wird, damit die Foto-Anforderung im Haupt-Spec steht.
- Bilddateien erzeugen ist nicht Teil dieser Tasks.

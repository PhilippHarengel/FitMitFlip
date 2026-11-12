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
- **THEN** öffnet sich die Kochkarte dieses Gerichts

### Requirement: Rezept öffnen
Ein geöffnetes Buchrezept SHALL eine Kochkarte zeigen. Die Karte SHALL den Namen, die Zutaten und die Anleitung aus dem Rezeptbuch enthalten. Ein Entwurf SHALL den bisherigen Editor behalten und SHALL diese Karte nicht zeigen.

#### Scenario: Rezept ansehen
- **WHEN** der Nutzer ein Gericht aus dem Kochbuch öffnet
- **THEN** sieht er auf der Kochkarte den Namen, die Zutaten und die Anleitung dieses Gerichts

#### Scenario: Reihenfolge
- **WHEN** der Nutzer ein Buchgericht öffnet
- **THEN** folgen Hero, Makrozeile, Zutaten und Zubereitung aufeinander, die Video-Aktion steht unter der Zubereitung, und `Eaten` oder `Undo` steht ausserhalb dieses scrollenden Inhalts

#### Scenario: Entwurf bleibt Editor
- **WHEN** der Nutzer einen Entwurf oder `New draft` öffnet
- **THEN** sieht er die Felder `Name`, `Ingredients` und `Instructions` und keine Kochkarte

#### Scenario: Aus dem Plan
- **WHEN** der Nutzer ein Gericht in einem Plan-Tag antippt
- **THEN** sieht er dieselbe Kochkarte wie aus dem Kochbuch

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

### Requirement: Hero der Kochkarte
Die Kochkarte eines Buchgerichts SHALL ein Hero zeigen. Ist der Rezept-ID ein Foto zugeordnet, SHALL das Hero dieses Foto zeigen, sonst einen Farbblock und kein erfundenes Foto. Der Name SHALL in einer Milchglasleiste an der Unterkante des Heros stehen. Dieselbe Rezept-ID SHALL aus Kochbuch und Plan denselben Farbblock zeigen.

#### Scenario: Zugeordnetes Foto
- **WHEN** für das geöffnete Buchgericht ein Foto an der Rezept-ID liegt
- **THEN** zeigt das Hero dieses Foto und die Milchglasleiste den Namen

#### Scenario: Kein Foto
- **WHEN** für das geöffnete Buchgericht kein Foto an der Rezept-ID liegt
- **THEN** zeigt das Hero einen Farbblock, kein erfundenes Foto, und die Milchglasleiste den Namen

#### Scenario: Dieselbe ID aus dem Plan
- **WHEN** dasselbe Buchgericht ohne Foto einmal aus dem Kochbuch und einmal aus dem Plan geöffnet wird
- **THEN** zeigt das Hero beide Male denselben Farbblock

### Requirement: Makrozeile der Portion
Die Kochkarte SHALL die kcal, das Protein, die Kohlenhydrate und das Fett dieses Rezepts in einer Zeile zeigen. Das SHALL die Werte der Portion sein, die `Eaten` speichert. Die Zeile SHALL keine Tagesziele und keine Ringe zeigen.

#### Scenario: Werte der Portion
- **WHEN** der Nutzer ein Buchgericht öffnet
- **THEN** zeigt die Zeile die kcal, das Protein, die Kohlenhydrate und das Fett dieses Gerichts

#### Scenario: Keine Tagessumme
- **WHEN** der Nutzer ein Buchgericht öffnet
- **THEN** fehlen auf der Kochkarte Tagesziele und Makroringe

### Requirement: Zutatenzeilen
Die Kochkarte SHALL den Zutatenstring an Semikolons ausserhalb von Klammern in Zeilen teilen. Eine führende Zahl, optional mit Dezimalkomma, SHALL links stehen. Ein bekanntes Einheitenwort direkt dahinter SHALL mit nach links. Sonst SHALL der Rest rechts der Name sein. Ohne Zahl SHALL die Zeile roh bleiben. Leere Stücke SHALL keine Zeile erzeugen. Notizen SHALL sichtbar bleiben. Die Karte SHALL keine Einheiten umrechnen.

#### Scenario: Zwei Zutaten
- **WHEN** die Zutaten `50 g Haferflocken; 200 ml Milch` sind
- **THEN** zeigt die Karte eine Zeile mit `50 g` links und `Haferflocken` rechts und eine Zeile mit `200 ml` links und `Milch` rechts

#### Scenario: Semikolon in der Klammer
- **WHEN** die Zutaten `2 Scheiben Toast (Croutons; gewürfelt); 2 Eier` sind
- **THEN** steht in der ersten Zeile links `2 Scheiben` und rechts `Toast (Croutons; gewürfelt)`, und in der zweiten links `2` und rechts `Eier`

#### Scenario: Klammer-Menge bleibt am Namen
- **WHEN** eine Zutat `0,5 TL Dijon-Senf (2,5 g)` ist
- **THEN** steht links `0,5 TL` und rechts `Dijon-Senf (2,5 g)`, nicht `2,5 g`

#### Scenario: Stückzahl
- **WHEN** eine Zutat `2 Eier` ist
- **THEN** steht links `2` und rechts `Eier`

#### Scenario: Kein Einheitenwort
- **WHEN** eine Zutat `2 große Zwiebeln` ist
- **THEN** steht links `2` und rechts `große Zwiebeln`

#### Scenario: Ohne Menge
- **WHEN** ein Zutatenstück `Salz` ist
- **THEN** zeigt die Karte eine Rohzeile `Salz` und keine erfundene Menge

#### Scenario: Leeres Stück
- **WHEN** die Zutaten `50 g Haferflocken;` sind
- **THEN** zeigt die Karte nur die Haferflocken-Zeile

### Requirement: Zubereitung als Absatz
Die Kochkarte SHALL die Anleitung als einen Absatz zeigen, wenn der Buchtext keinen Zeilenumbruch enthält. Jede nicht leere Zeile SHALL sonst ein eigener Absatz in derselben Reihenfolge sein. Die Karte SHALL an Punkten keine Schritte schneiden und SHALL keine Schrittnummern erfinden.

#### Scenario: Ein Absatz
- **WHEN** die Anleitung `Hafer kochen. Banane darauf.` ohne Zeilenumbruch ist
- **THEN** zeigt die Karte diesen Text als einen Absatz und keine nummerierten Schritte

#### Scenario: Zeilenumbrüche
- **WHEN** die Anleitung `Hähnchen anbraten.` und danach in der nächsten Zeile `Reis kochen.` enthält
- **THEN** zeigt die Karte diese beiden Zeilen als zwei Absätze in dieser Reihenfolge

### Requirement: Video auf der Kochkarte
Die Kochkarte SHALL die Video-Aktion unter der Zubereitung im scrollenden Inhalt zeigen. Ein gespeicherter `http`- oder `https`-Link SHALL `Open video` anbieten, und diese Aktion SHALL diesen Link öffnen. Anderer Text SHALL `Open video` nicht anbieten. Ohne Link heisst die Nebenaktion `Add video`, mit Link `Edit video`. Sie SHALL das Eingabefeld erst nach der Wahl zeigen. Speichern SHALL den Link nur auf dem Telefon behalten.

#### Scenario: Link öffnen
- **WHEN** am Buchgericht ein `https`-Link gespeichert ist und der Nutzer `Open video` wählt
- **THEN** öffnet die App diesen Link

#### Scenario: Feld bleibt zu
- **WHEN** am Buchgericht kein Link gespeichert ist
- **THEN** sieht der Nutzer `Add video`, kein `Open video`, und das Eingabefeld erst nach `Add video`

#### Scenario: Link bleibt lokal
- **WHEN** der Nutzer an einem Buchgericht einen `https`-Link speichert und das Gericht erneut öffnet
- **THEN** bietet die Karte `Open video` für diesen Link, ohne dass der Link aus dem Rezeptbuch kommen muss

### Requirement: Eaten bleibt sichtbar
Auf der Kochkarte SHALL `Eaten` oder `Undo` am unteren Rand sichtbar bleiben, während Hero, Makros, Zutaten, Zubereitung und Video scrollen. Beschriftung und Wirkung SHALL die der Anforderung `Heute gegessen` bleiben.

#### Scenario: Langer Text
- **WHEN** die Zubereitung länger ist als der sichtbare Bereich
- **THEN** bleibt `Eaten` oder `Undo` sichtbar, ohne dass der Nutzer bis unter die Zubereitung scrollt

#### Scenario: Schon gegessen
- **WHEN** für dieses Rezept heute schon eine Portion existiert
- **THEN** heisst der feststehende Knopf `Undo`

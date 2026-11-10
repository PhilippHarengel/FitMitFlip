# shopping-plan Specification

## Purpose

Der Einkaufsplan wählt Gerichte aus dem Notion-Rezeptbuch für die nächsten Tage und liefert die summierte Einkaufsliste.

## Requirements

### Requirement: Eine Plananfrage
Der Nutzer SHALL die Anzahl der Tage, ausgelassene Mahlzeiten und einen optionalen Hinweis angeben. Das System SHALL daraus eine Anfrage machen, die das heutige Datum und den zuletzt gespeicherten Plan als zuletzt gegessen enthält.

#### Scenario: Formular absenden
- **WHEN** der Nutzer einen Plan für die nächsten fünf Tage anfordert, Mittwoch Abend auslässt und einen Hinweis schreibt
- **THEN** geht eine Anfrage mit dieser Angabe, dem heutigen Datum und dem letzten gespeicherten Plan hinaus

#### Scenario: Kein zweiter Kanal
- **WHEN** der Nutzer einen Plan anfordert
- **THEN** entsteht derselbe Plan ohne eine Telegram-Nachricht und ohne einen Make-Lauf

### Requirement: Nur Gerichte aus dem Rezeptbuch
Das System SHALL Rezept-IDs nur aus dem Notion-Rezeptbuch wählen. Ein Plan mit unbekannter ID oder einem Entwurf SHALL verworfen werden.

#### Scenario: Unbekannte ID
- **WHEN** die Auswahl eine ID enthält, die nicht im Rezeptbuch steht
- **THEN** enthält die Antwort den Grund und keine neue Einkaufsliste

#### Scenario: Entwurf
- **WHEN** ein lokaler Entwurf existiert
- **THEN** kann der Plan diesen Entwurf nicht enthalten

### Requirement: Geprüfter Plan oder Grund
Eine erfolgreiche Antwort SHALL jeden Tag des Fensters mit Frühstück, Mittagessen und Abendessen enthalten, jeweils ein Rezept oder ausgelassen, und eine Einkaufsliste nach Kategorie. Schlägt die Prüfung fehl, SHALL die Antwort den Grund enthalten und keine neue Liste.

#### Scenario: Gültiges Fenster
- **WHEN** die Auswahl zum angefragten Fenster und zu den Slot-Regeln passt
- **THEN** sieht der Nutzer die Tage und die Einkaufsliste

#### Scenario: Falscher Slot
- **WHEN** eine grosse Mahlzeit als Abendessen gewählt ist
- **THEN** sieht der Nutzer den Grund und keine neue Einkaufsliste

### Requirement: Slot-Regeln bleiben
Frühstück SHALL nur ein Frühstücksrezept sein, das weder grosse noch kleine Mahlzeit ist. Mittagessen SHALL nur eine grosse Mahlzeit sein. Abendessen SHALL nur eine kleine Mahlzeit sein. Eine grosse Mahlzeit SHALL höchstens zweimal im Fenster vorkommen und dann als ein Kochvorgang mit zwei Portionen. Ein Rezept, dessen Name im letzten Plan steht, SHALL nicht gewählt werden. Das Fenster SHALL ab morgen laufen, ausser der Schalter für den Start heute ist an.

#### Scenario: Grosse Mahlzeit zweimal
- **WHEN** dieselbe grosse Mahlzeit an zwei Mittagen steht
- **THEN** zeigt der Plan einen Kochvorgang mit zwei Portionen und einen Rest, und die Zutaten zählen einmal mit Faktor zwei

#### Scenario: Zuletzt gegessen
- **WHEN** der Name eines Rezepts im letzten gespeicherten Plan steht
- **THEN** enthält der neue Plan dieses Rezept nicht

### Requirement: Einkauf aus Zutatenzeilen
Das System SHALL die Zutaten der geplanten Gerichte summieren. Eine Zeile mit Vorrat SHALL in der Einkaufssumme fehlen und SHALL in einer Prüfliste stehen. Dieselbe Zutat in derselben Einheit SHALL eine Zeile sein. Zeilen, die schon in g oder ml stehen, SHALL in dieser Einheit bleiben.

#### Scenario: Vorrat
- **WHEN** eine Zutat als Vorrat markiert ist
- **THEN** fehlt sie in der Einkaufssumme und steht in der Vorratsliste zum Prüfen

#### Scenario: Gleiche Zutat
- **WHEN** zwei Gerichte dieselbe Zutat in g enthalten
- **THEN** zeigt die Liste eine Zeile mit der Summe der Mengen

### Requirement: Feste Werte für EL, Zehe und Stange
Das System SHALL eine Knoblauchzehe als 4 g, eine Selleriestange als 50 g und einen EL mit dem festen Wert des Lebensmittels umrechnen, bevor es summiert. Steht in der Klammer eine Menge in g oder ml, SHALL diese Menge gelten. Ein EL oder TL ohne festen Wert und ohne Klammer-Menge SHALL trotzdem auf die Einkaufsliste, damit keine Zutat verloren geht. Semikolons in Klammern SHALL die Zutatenzeile nicht zerteilen. reine Notizen wie Garzeit oder abgetropft SHALL weder Liste noch nicht lesbar füllen.

#### Scenario: Knoblauch
- **WHEN** ein Plan 2 Zehen Knoblauch und 2 g Knoblauch enthält
- **THEN** zeigt die Liste Knoblauch mit 10 g

#### Scenario: Sellerie
- **WHEN** ein Plan 1,5 Stangen Sellerie enthält
- **THEN** zeigt die Liste Sellerie mit 75 g

#### Scenario: EL mit Wert
- **WHEN** ein Plan 2 EL Mehl, 1 EL Sesamkörner, 3 EL Teriyaki-Sauce, 1 EL neutrales Öl, 2 EL Reisessig und 0,5 EL Olivenöl zusammen mit 50 ml Olivenöl enthält
- **THEN** zeigt die Liste Mehl 20 g, Sesamkörner 9 g, Teriyaki-Sauce 45 ml, neutrales Öl 14 g, Reisessig 30 ml und Olivenöl 57,5 ml

#### Scenario: EL ohne Wert
- **WHEN** ein Plan einen EL eines Lebensmittels ohne festen Wert enthält und die Zeile kein Vorrat ist
- **THEN** bleibt die Zutat auf der Einkaufsliste

#### Scenario: Semikolon in der Klammer
- **WHEN** eine Zutat Notizen in der Klammer mit Semikolon trägt, etwa Toast mit Croutons-Hinweis oder Ei mit Garzeit
- **THEN** landet nur die Zutat auf der Liste und die Notiz weder unter Einkauf noch unter nicht lesbar

#### Scenario: Klammer-Menge bei TL oder Kopf
- **WHEN** eine Zeile `0,5 TL Dijon-Senf (2,5 g)` oder `0,5 Kopf Römersalat (313 g)` ist
- **THEN** zeigt die Liste Dijon-Senf mit 2,5 g und Römersalat mit 313 g

#### Scenario: EL-Vorrat
- **WHEN** Honig, Sojasauce oder Tomatenmark als EL und als Vorrat stehen
- **THEN** fehlen sie in der Einkaufssumme und stehen in der Vorratsliste

### Requirement: Formularfelder
Das Formular SHALL eine frei eingebbare Tageszahl mit Standard 7, einen Button für Start heute mit Standard aus, für jeden Tag des Fensters eigene Schalter für Frühstück, Mittagessen und Abendessen und ein optionales Hinweis-Feld anbieten. Der erste Tipp auf einen Tag ohne Ausfall SHALL an diesem Tag alle drei Mahlzeiten ausfallen lassen. Ein Tipp auf eine Mahlzeit SHALL nur diese Mahlzeit an diesem Tag ändern. Ein Tag SHALL ohne Ausfall sein, sobald keine seiner Mahlzeiten mehr ausfällt. Die Anfrage SHALL je ausfallender Mahlzeit einen Eintrag aus Wochentag und Mahlzeit enthalten.

#### Scenario: Standard
- **WHEN** der Nutzer das Formular öffnet und noch nichts geändert hat
- **THEN** stehen 7 Tage, der Start ist morgen und der Button für heute ist aus

#### Scenario: Tageszahl
- **WHEN** der Nutzer die Tageszahl auf 3 setzt
- **THEN** zeigt das Fenster drei Tage

#### Scenario: Start heute
- **WHEN** der Nutzer den Button für heute einschaltet und den Plan anfordert
- **THEN** beginnt das Fenster am heutigen Datum

#### Scenario: Erster Tipp
- **WHEN** der Nutzer einen Tag ohne Ausfall antippt
- **THEN** fallen an diesem Tag Frühstück, Mittagessen und Abendessen aus

#### Scenario: Eigene Mahlzeiten
- **WHEN** der Nutzer am Montag nur das Frühstück und am Mittwoch nur das Abendessen auslässt
- **THEN** enthält die Anfrage genau diese beiden Ausfälle

#### Scenario: Letzte Mahlzeit
- **WHEN** der Nutzer die letzte ausfallende Mahlzeit eines Tages ausschaltet
- **THEN** enthält die Anfrage keinen Ausfall an diesem Tag

### Requirement: Liste bleibt nach Fehlschlag
Ein Fehlschlag SHALL den Grund zeigen. Ein vorher gespeicherter gültiger Plan SHALL sichtbar bleiben. Existiert keiner, SHALL keine Liste erscheinen.

#### Scenario: Fehlschlag mit altem Plan
- **WHEN** ein gültiger Plan gespeichert ist und eine neue Anfrage fehlschlägt
- **THEN** sieht der Nutzer den Grund und weiterhin die Einkaufsliste und die Tage des gespeicherten Plans

#### Scenario: Fehlschlag ohne Plan
- **WHEN** noch kein Plan gespeichert ist und die Anfrage fehlschlägt
- **THEN** sieht der Nutzer den Grund und keine Einkaufsliste

### Requirement: Einkauf ist der Hauptinhalt
Nach einem erfolgreichen Plan SHALL die Einkaufsliste nach Kategorie der Hauptinhalt sein. Die Tage mit Kochen oder Rest SHALL auf demselben Ergebnis stehen.

#### Scenario: Ergebnis
- **WHEN** ein Plan erfolgreich zurückkommt
- **THEN** sieht der Nutzer zuerst die Einkaufsliste und dazu die Tage des Fensters

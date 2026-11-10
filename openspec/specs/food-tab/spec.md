# food-tab Specification

## Purpose

Der Food-Tab ist die Oberfläche für das Kochbuch und den Einkaufsplan. Er erfasst keine einzelnen Lebensmittel mehr.

## Requirements

### Requirement: Food-Tab zeigt Kochbuch und Plan
Der Food-Tab SHALL die Bereiche Cookbook, Plan und List anbieten. Der gewählte Bereich SHALL sichtbar bleiben, bis der Nutzer umschaltet. Der Tab SHALL keinen Datumsschieber anzeigen. List SHALL die zuletzt gespeicherte Einkaufsliste zeigen, auch während Plan das Formular für einen neuen Plan zeigt.

#### Scenario: Tab öffnen
- **WHEN** der Nutzer den Food-Tab öffnet
- **THEN** sind Cookbook, Plan und List erreichbar und es gibt keinen Tageskopf

#### Scenario: Bereich bleibt
- **WHEN** der Nutzer List wählt und danach ein Rezept aus der Liste öffnet und zurückgeht
- **THEN** ist List weiterhin der sichtbare Bereich

### Requirement: Geplantes Gericht öffnet das Rezept
Ein Gericht in einem Plan-Tag SHALL denselben Rezept-Screen öffnen wie der Eintrag im Cookbook.

#### Scenario: Aus dem Plan öffnen
- **WHEN** der Nutzer ein Gericht in einem Plan-Tag antippt
- **THEN** sieht er Zutaten und Anleitung dieses Gerichts im Rezept-Screen

### Requirement: Alte Erfassung ist entfernt
Der Food-Tab SHALL keine Lebensmittelsuche, keinen Barcode-Scanner, kein manuelles Nährwertformular, keine Meal-Presets und keine Liste der Tageseinträge anzeigen.

#### Scenario: Keine Erfassung
- **WHEN** der Nutzer den Food-Tab öffnet
- **THEN** fehlen Suche, Scanner, manuelles Eintragen, Meals und die Tageslog-Liste

### Requirement: Home behält die Tagessumme
Home SHALL Kalorien und Makros des gewählten Tages aus den gespeicherten Tageseinträgen anzeigen. Der Leer-Hinweis SHALL `Open the cookbook` lauten und SHALL `Log your first meal` nicht mehr enthalten.

#### Scenario: Leerer Tag
- **WHEN** für den gewählten Tag keine Einträge existieren und Ziele gesetzt sind
- **THEN** zeigt Home die leeren Summen und den Hinweis `Open the cookbook`

#### Scenario: Gespeicherte Portion zählt
- **WHEN** für den gewählten Tag eine gegessene Portion gespeichert ist
- **THEN** enthält die Home-Summe die Makros dieser Portion

# Design

## Context

Siehe `proposal.md` für den Anlass und `specs/cookbook/spec.md` für das Verhalten. `screens/RecipeScreen.tsx` hat zwei Modi. Ohne `draftId` lädt `loadCookbook` das Gericht und rendert Name, `zutaten` und `anleitung` als drei Textblöcke, darunter immer das Video-Feld, `Save video` und `Eaten`. Mit `draftId` ist es der Editor. `Screen` scrollt alle Kinder. Fotos kommen über `bookPhoto(id)`. Die Kachelfarben in `FoodScreen` hängen am Listenindex, nicht an der ID. Die Einkaufsliste zerlegt Zutaten im Worker und rechnet Einheiten um. Diese Zerlegung liegt nicht in der App.

## Goals / Non-Goals

**Goals:**

- Die Buchansicht in `RecipeScreen` wird die Kochkarte. Der Entwurf-Zweig bleibt.
- Zutatenzeilen und Absätze sind reine Funktionen mit eigenen Tests.
- `Eaten` bleibt sichtbar, ohne die Speicherlogik in `db/queries.ts` zu ändern.

**Non-Goals:**

- Kachel-Raster, Worker und Einkaufsliste anfassen.
- Die HTML-Demo oder einen Schrittmodus nachbauen.
- Den Entwurf-Editor umbauen.

## Decisions

### Reine Zerlegung, nicht die Einkaufslogik

Neue Funktionen in `lib/recipeLines.ts`. Sie teilen am Semikolon nur bei Klammentiefe null, lassen leere Stücke weg und schneiden die Anleitung an `\n`, ohne leere Zeilen und ohne Schnitt an Punkten. Die Mengenzeile nimmt eine führende Zahl mit optionalem Dezimalkomma. Das nächste Wort wandert nur dann mit nach links, wenn es in der festen Einheitenliste steht: `g`, `kg`, `ml`, `l`, `EL`, `TL`, `Stk`, `Stück`, `Scheibe`, `Zehe`, `Bund`, `Stange`, `Kopf`, `Prise`, `Dose`, `Packung`, `Tasse`, jeweils auch der Plural auf `n` oder `en`, Vergleich ohne Grossschreibung. Sonst bleibt das Wort beim Namen. Keine Umrechnung nach `g` oder `ml`.

Alternative, den Worker-Parser zu rufen: verworfen. Der verwirft Notizen und rechnet um. Die Karte soll den Buchtext zeigen.

### Buchzweig in RecipeScreen, Editor unangetastet

Nur der Zweig `recipe` bekommt Hero, Makrozeile, Zeilen, Absätze und die Video-Nebenaktion. `draftMode` rendert weiter `Field` für Name, Ingredients, Instructions, Video, plus Save, Confirm und Delete. Fehlertext beim fehlenden Buch bleibt über dem Inhalt.

### Hero

Foto über `bookPhoto(recipe.id)`, sonst ein Farbblock. Die Farbe ist `POD_SWATCHES[hash(id) % length]` aus derselben Palette wie die Kacheln, exportiert als eine Funktion der Rezept-ID. Kochbuch und Plan treffen damit dieselbe Farbe. Die Kachelfarbe bleibt indexbasiert. Die Milchglasleiste kopiert die Leiste der Kachel: heller Grund, dunkle Schrift, Name unten auf dem Hero. So bleibt der Name auf dem Foto in beiden Farbschemen lesbar.

Alternative, die Kachelfarbe per Navigation mitzugeben: verworfen. Der Plan hat keinen Listenindex, und die Spec verlangt denselben Block aus beiden Eingängen.

### Makrozeile

Eine Textzeile aus `kcal`, `protein`, `kohlenhydrate` und `fett`. Englische Einheiten `kcal` und `g`, Beschriftungen `protein`, `carbs`, `fat`. Keine `Ring`-Komponente und keine Tagesziele.

### Video zu

`Open video` nur bei `http` oder `https`, weiter über `Linking`. Ohne gespeicherten Link heisst die Nebenaktion `Add video`, mit Link `Edit video`. Das Feld und `Save video` erscheinen erst nach dieser Aktion. Speichern ruft weiter `saveRecipeVideo` und schickt nichts an `loadCookbook`.

### Eaten ausserhalb des Scrolls

Im Buchmodus `Screen` mit `scroll={false}`. Darin ein eigener `ScrollView` für die Karte und darunter der bestehende `Button` für `Eaten` oder `Undo`. `toggleEaten` bleibt. Der Entwurf behält den scrollenden `Screen`, weil das Formular lang ist und keinen festen Knopf braucht.

## Risks / Trade-offs

- [Kachelfarbe und Hero-Farbe eines Gerichts können auseinanderlaufen] → Spec verlangt nur, dass Kochbuch und Plan dieselbe Hero-Farbe zeigen. Die Kachel bleibt am Index.
- [Ein Einheitenwort ausserhalb der Liste rutscht zum Namen] → Die Liste deckt die Wörter aus `shopping-plan`. Ein neues Wort ist eine Zeile in `recipeLines`, kein Parserumbau.
- [`allText` in `foodTab.test.tsx` erwartet den Zutatenstring mit Semikolon und `200 g Hähnchenbrust` als einen Text] → Assertions auf die einzelnen Zeilen umstellen. `Reis kochen.` bleibt ein Absatz.
- [Ungepaarte Klammer schluckt den Rest bis zum Ende] → Semikolons darin teilen nicht. Lieber eine lange Zeile als eine zerschnittene Notiz.

## Migration Plan

1. Funktionen und Buchansicht in der App ausliefern. Kein Worker-Deploy, keine Migration gespeicherter Links oder Portionen.
2. Rollback stellt den Buchzweig von `RecipeScreen` wieder her. `lib/recipeLines.ts` darf ungenutzt liegen bleiben.

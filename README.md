# FitMitFlip

A personal, offline-first fitness tracker for iPhone (and Android). Log your
strength workouts, scan food barcodes to track macros, and keep an eye on your
daily goals — all stored locally on the device, no account and no cloud.

Built with Expo / React Native and TypeScript. The data lives in an on-device
SQLite database, so the app works fully offline; the only network call is an
optional food lookup against [OpenFoodFacts](https://world.openfoodfacts.org).

## Features

Three tabs, one shared date so everything you log lands on the same day.

### 🏋️ Workout
- Pre-built strength splits (Upper Body, Leg Day, Full Body), plus Jogging and Rest.
- Three sets per exercise with weight (2.5 kg steps) and reps wheel pickers.
- Sets pre-fill from your last session for the same exercise, so you only adjust what changed.
- Bodyweight / reps-only exercises (pull-ups, dips) handled separately.
- Per-set confirm and delete; an `X/3` badge counts only confirmed sets.
- A 3-minute rest timer that fires a local notification when rest is over (works on the lock screen in a standalone build), with a haptic + visual cue as fallback.
- Per-exercise history and a top-set progress chart.
- Editable weekly plan with one-off day adjustments.

### 🏠 Home
- Daily status card: whether today's planned workout is done.
- Daily macros (kcal, protein, carbs, fat) totalled against your targets — set goals once, see progress every day.
- Calendar date picker to jump to any day; the date stays in sync across all tabs.
- Full backup to a JSON file and restore from one (lossless dump of every table).
- Import past training from plain-text notes.

### 🍎 Food
- Scan a barcode with the camera, or search by name, via OpenFoodFacts.
- Manual entry for anything not in the database (manual foods never expire from the local cache).
- Pick a serving size; macros are computed per 100 g.
- Per-day food log with per-entry delete.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs) |
| Storage | `expo-sqlite` with versioned migrations |
| Charts | `react-native-chart-kit` + `react-native-svg` |
| Device APIs | `expo-camera`, `expo-notifications`, `expo-haptics`, `expo-file-system`, `expo-document-picker`, `expo-sharing` |
| Food data | OpenFoodFacts public API |

## Project layout

```
App.tsx                  Tab navigator (Workout / Home / Food)
screens/                 One file per screen + the modals (history, weekly plan, import)
components/              Shared date context, date navigator, error boundary
db/
  db.ts                  SQLite open + ordered migrations (PRAGMA user_version)
  queries.ts             All reads/writes, date helpers, backup/restore
  workoutTemplates.ts    Splits, exercises, weight/reps option ranges
  importNotes.ts         Plain-text training-notes parser
  backup.ts              Export the DB to a JSON file
lib/restNotify.ts        Rest-timer local notifications
api/openFoodFacts.ts     Barcode + name food lookup
plugins/                 Config plugin that strips the push entitlement (free Apple ID)
```

## Getting started

Requires [Node.js](https://nodejs.org) and the Expo tooling. Install dependencies:

```bash
npm install
```

Run in development (Metro dev server + Expo Go or a simulator):

```bash
npm start        # expo start — then press i / a, or scan the QR code
npm run ios      # build & run on an iOS simulator/device
npm run android  # build & run on an Android emulator/device
```

### Standalone build (no dev server)

To install a real app on your iPhone that opens from the home screen with no
server running, see **[BUILDING.md](BUILDING.md)**. Short version, with the phone
plugged in:

```bash
npx expo run:ios --device --configuration Release
```

Note: a free Apple ID signs the app for 7 days, after which you reinstall with
the same command. Your SQLite data survives reinstalls as long as the bundle
identifier stays the same. Full details (signing, trust, the weekly reinstall,
the Android alternative) are in BUILDING.md.

## Data & privacy

Everything is stored locally in SQLite on the device. There is no account, no
analytics, and no sync. The only outbound request is the optional food lookup to
OpenFoodFacts. Use **Home → Backup** to export a JSON copy you control, and
**Restore** to load it back.

## License

[MIT](LICENSE).

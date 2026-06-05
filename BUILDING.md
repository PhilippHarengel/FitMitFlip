# Running FitMitFlip without the dev server

By default you start the app with `expo start`, which runs the Metro dev server
and loads the JavaScript over the network into Expo Go. That means the server has
to be running every time.

This guide builds a **standalone Release app** installed straight onto your
iPhone. The JavaScript is baked into the app, so it opens from the home screen
with **no server running**.

## The one catch: free Apple ID = 7-day signing

Apple lets you sign apps with a free Apple ID, but the signature **expires after
7 days** — after that the app won't open until you reinstall it. There's no way
around this without a paid Apple Developer account ($99/yr). So this is an
"install, use for a week, reinstall" flow. The reinstall is one command and about
two minutes.

(Local notifications like the rest timer work fine on a free account. Only remote
push would need the paid one.)

## One-time setup

Xcode is already installed on this Mac. You just need to sign in once:

1. Open **Xcode** → menu **Xcode → Settings → Accounts** → **+** → add your Apple
   ID. This creates a free "Personal Team" used for signing.
2. Plug your iPhone into the Mac with a cable. On the phone, tap **Trust** when
   asked.

## Build and install (also the weekly reinstall)

With the iPhone plugged in, from the project folder run:

```bash
npx expo run:ios --device --configuration Release
```

- When prompted, pick your iPhone from the device list.
- The **first** run generates the native project, downloads CocoaPods, and
  compiles — this can take 20-40 minutes. Later runs are much faster.
- `--configuration Release` is what bundles the JS into the app. Without it you
  get a debug build that still needs the Metro server. Always include it.

**If signing fails** (red error about provisioning/team):

1. Open `ios/FitMitFlip.xcworkspace` in Xcode.
2. Select the **FitMitFlip** target → **Signing & Capabilities** tab.
3. Check **Automatically manage signing** and pick your **Personal Team**.
4. Re-run the command above.

**First launch on the phone:** the command will finish with a "failed to
launch ... profile has not been explicitly trusted" error. That is expected —
the app is already installed, iOS just won't open it until you trust the
developer. Go to **Settings → General → VPN & Device Management**, tap
**Apple Development: <your Apple ID>**, and **Trust** it. Then tap the
FitMitFlip icon on the home screen.

(Note: `expo-notifications` would normally add a Push Notifications entitlement
that a free Apple account can't sign. `plugins/withoutPushEntitlement.js` strips
it on every build. The rest-timer uses local notifications, which still work.)

## After ~7 days

The app stops opening. Plug the phone back in and run the same command:

```bash
npx expo run:ios --device --configuration Release
```

Your data is safe — the SQLite database stays on the device across reinstalls as
long as the bundle identifier (`com.philippharengel.fitmitflip`) doesn't change.

## If you ever want to stop reinstalling weekly

- **Paid Apple Developer account ($99/yr)** → use **TestFlight**: install via the
  TestFlight app, each build lasts 90 days, refreshed with a cloud build. No
  cable, no weekly chore.
- **Android phone** → `npx expo run:android --device --configuration Release`
  (the `android.package` is already set). A free Android build never expires.

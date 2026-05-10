# iOS Release Readiness

Run the automated check before opening Xcode:

```bash
npm run ios:check
```

For a fast local validation after a known-good build:

```bash
npm run ios:check -- --skip-build --skip-sync
```

The check verifies release web output and budgets, required Capacitor/iOS
files, app icon and splash assets, Capacitor sync readiness, and that the
native `ios/App/App/public` web bundle matches the current generated `www`
bundle file-for-file.

After generating App Store screenshots, run the handoff verifier:

```bash
npm run release:handoff
```

It checks the local App Store evidence package and reports owner-controlled
actions that remain, such as Xcode license/signing, TestFlight upload, real
device validation, and final App Store Connect fields. It also verifies that the
latest App Store screenshot capture and campaign world visual audit receipts
exist, passed, and are newer than the screen/UI/runtime/campaign layout files
they cover. The screenshot receipt must include its index, expected capture
dimensions, and no per-capture console/page errors. It also scans the runtime
asset manifest for missing files and temporary placeholder naming, checks that
the generated `www` bundle is fresh against source JS/config/static assets,
requires fresh browser performance smoke metrics, screenshots, and clean console
receipts for the controls, projectile, terrain, impact, and high-scores
scenarios, and rechecks that the native
`ios/App/App/public` web bundle matches `www`, so run `npm run ios:check` first
if this fails.

For the campaign art pass, also run:

```bash
npm run audit:worlds
```

This starts one representative level in each campaign world, captures the
running battlefield, and fails if captures are blank or too visually similar.

Local smoke tests should use an offline generated runtime config from `npm run generate-config:offline`, so high-score/Convex services never block startup or visual captures. Online/TestFlight builds should generate `config.js` with `CONVEX_URL=<deployment-url> npm run generate-config` before building.

## Device Matrix

Test on physical devices when possible:

- iPhone SE size class: small viewport, safe-area pressure, touch targets.
- iPhone standard size: baseline portrait gameplay.
- iPhone Pro Max size: wide layout, HUD spacing, bottom controls.
- iPad: large canvas scaling and center-stage layout.
- One older supported iOS version and the current iOS version.

## Manual Checklist

- Orientation: launch and gameplay stay in the intended orientation; rotation does not mis-map touch input.
- Safe area: HUD, weapon dock, fire button, pause button, and modal controls avoid notches, home indicator, and Dynamic Island.
- Startup: app launches offline after install; title scene renders without external fonts/network; no blank WebView.
- Gameplay: first shot, projectile flight, terrain impact, de-rez fragments, tank damage, and turn transition stay responsive.
- Performance: run low/balanced/high quality profiles; watch for thermal throttling after several terrain impacts.
- Audio: first user gesture unlocks audio; mute and music/sfx sliders persist; app resumes cleanly after backgrounding.
- Haptics: fire, hit, and purchase haptics trigger on device and degrade silently if unavailable.
- Network: Convex/high-score failures do not block menu, gameplay, collection, or supply-drop flows.
- Persistence: money, tokens, unlocked tanks, settings, and render quality survive force quit/relaunch.
- App assets: icon appears correctly on Home Screen, App Library, Settings, and TestFlight; splash fills the launch screen.

## TestFlight Pass

1. Run `npm run ios:check`.
2. Open Xcode with `npm run open:ios`.
3. Set signing team and release build configuration.
4. Archive to a real device target.
5. Upload to TestFlight.
6. Install from TestFlight on at least two device sizes.
7. Repeat the manual checklist from a clean install and from an upgrade over the previous build.

Record any device-specific layout, audio, haptic, or performance failures as beads before shipping.

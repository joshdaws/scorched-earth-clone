# App Store Submission Checklist

Generated on 2026-05-09 for the iOS/App Store handoff.

This checklist turns the current repo state into the remaining App Store
Connect actions. It does not claim the app is live or approved; Apple Developer
account access, signing, TestFlight, and final App Store Connect submission are
still owner-controlled steps.

## Official References

- App Store Connect app information:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/app-information>
- App Store Connect platform version fields:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information>
- Screenshot specifications:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- App privacy details:
  <https://developer.apple.com/app-store/app-privacy-details/>
- App privacy reference:
  <https://developer.apple.com/help/app-store-connect/reference/app-privacy>
- App review information:
  <https://developer.apple.com/help/app-store-connect/reference/app-review-information>

## Release Mode Decision

Pick one mode before archiving the native build. The App Store privacy answers,
support copy, and review notes must match this decision.

| Decision | Offline-first release | Online high-score release |
| --- | --- | --- |
| Runtime config | `npm run generate-config:offline` before `npm run build:ios` | `CONVEX_URL=<production-url> npm run generate-config` before `npm run build:ios` |
| Network dependency | None for core gameplay | Convex is optional; gameplay must still work if unavailable |
| App privacy label draft | Data Not Collected, if no other SDKs are added | Do not use the no-data answer without reclassifying score/name/device data |
| Privacy policy | Current `public/privacy.html` is aligned | Update policy with the production service operator, data retention, and user request route |
| Review notes | Say the app launches offline and needs no account | Say online scores are optional and no account is required |

Recommended first submission mode: offline-first. It avoids unfinished
leaderboard privacy disclosure, service availability, and account-review risk.

## Local Evidence Package

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Build and iOS sync readiness | `npm run ios:check` passes build, release budget, and `npx cap sync ios`. | Ready locally |
| App icon | `assets/icons/app-icon-1024.png` and `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`. | Ready locally |
| Launch assets | `assets/icons/splash-*.png` and `ios/App/App/Assets.xcassets/Splash.imageset/`. | Ready locally |
| Metadata draft | `docs/release/app-store-materials.md`. | Ready locally; owner fields remain |
| Privacy page | `public/privacy.html`, bundled by `npm run ios:check`; `https://scorched-earth.vercel.app/privacy.html` returned HTTP 200 on 2026-05-09. | Ready |
| Support page | `public/support.html`, bundled by `npm run ios:check`; `https://scorched-earth.vercel.app/support.html` returned HTTP 200 on 2026-05-09. | Ready; add direct contact details if release regions require them |
| Screenshots | `npm run screenshots:app-store` generated 24 accepted-size captures at `artifacts/app-store-screenshots/2026-05-09T23-12-09-645Z/summary.json`. | Ready locally; upload/select final images in App Store Connect |
| TestFlight guide | `docs/ios-testflight-setup.md`. | Ready locally; account action required |
| Device QA guide | `docs/ios-release-readiness.md`. | Ready locally; physical devices required |

## App Store Connect Fields

| Field | Draft value | Owner action |
| --- | --- | --- |
| Platform | iOS | Create app record |
| Name | Scorched Earth: Synthwave | Confirm against the installed app name `Scorched Earth` |
| Subtitle | Classic Artillery, Neon Style | Paste into platform version metadata |
| Bundle ID | `com.scorched.earth` | Select the registered identifier |
| SKU | `scorched-earth-synthwave-2026` | Confirm final SKU convention |
| Primary category | Games | Set in App Information |
| Primary subcategory | Strategy | Set in App Information |
| Secondary subcategory | Arcade | Set in App Information |
| Content rights | Does not contain third-party content | Confirm generated asset rights before submission |
| Made for Kids | No | Confirm with product/legal owner |
| Age rating | 9+ draft | Complete Apple's questionnaire |
| License agreement | Apple standard EULA | Confirm no custom EULA is needed |
| Copyright | `2026 Josh Daws` draft | Confirm legal owner string |
| Price | Product decision required | Choose free/paid tier |
| Availability | Product decision required | Choose countries/regions |
| Privacy policy URL | `https://scorched-earth.vercel.app/privacy.html` | Paste verified public URL |
| Support URL | `https://scorched-earth.vercel.app/support.html` | Paste verified public URL; confirm contact route is sufficient for selected regions |
| Marketing URL | `https://scorched-earth.vercel.app` draft | Optional |

## Privacy Nutrition Label Draft

Use this section only for the offline-first build with no analytics, ads, IAP,
or online high-score service enabled.

| App Store Connect privacy area | Draft answer | Evidence |
| --- | --- | --- |
| Data collection | Data Not Collected | `config.js` currently has `SERVICE_MODE: 'offline'` and `CONVEX_URL: ''`; progress and settings use local storage. |
| Tracking | No | No ATT, ad network, analytics, or cross-app tracking SDK is present in `package.json` or Capacitor plugins. |
| Linked to user | No | No sign-in or account system is required. |
| Third-party advertising | No | Deferred monetization epic `scorched-earth-ttk` is blocked. |
| In-app purchases | No for current build | No IAP plugin is installed. |
| Privacy policy | Required | Publish `public/privacy.html` and keep it aligned with final build behavior. |

If online high scores are enabled before submission, update the privacy label
before review. At minimum, re-evaluate display name, device identifier, score
history, run statistics, request metadata, data linkage, retention, and user
deletion/export paths. Apple requires the answers to include data collected by
third-party partners as well as the app's own code.

## Screenshots

Run from a clean release build:

```bash
npm run screenshots:app-store
```

Upload one to ten screenshots per required display slot. The local generator
produces:

| Slot | Generated size | Required role |
| --- | --- | --- |
| iPhone 6.9-inch | `2796x1290` landscape | Preferred current iPhone slot |
| iPhone 6.5-inch | `2688x1242` landscape | Fallback if 6.9-inch is not used |
| iPhone 5.5-inch | `2208x1242` landscape | Legacy fallback |
| iPad 13-inch | `2732x2048` landscape | Required because the app targets iPad |

Recommended upload order:

1. Title/menu.
2. Gameplay HUD.
3. Projectile impact.
4. Level-complete stars.
5. Supply drop or collection.
6. Armory shop.

Repeat the capture from TestFlight on real devices if final review assets must
exactly match the uploaded native build.

## App Review Notes

Use this draft for an offline-first build:

```text
Scorched Earth: Synthwave is a landscape iOS artillery game. The app launches
offline and does not require an account. Online leaderboard services are not
required for gameplay in this build. Controls are touch-first: drag/adjust angle
and power, choose a weapon, then press Fire. Progress, settings, tank unlocks,
achievements, and local scores are stored on device.
```

No demo account is required unless online services become sign-in gated.

## Pre-Archive Gates

Run these immediately before opening Xcode:

```bash
npm run generate-config:offline
npm run check
npm run ios:check
npm run screenshots:app-store
npm run audit:worlds
npm run release:handoff
git status --short
```

If Xcode is installed but `xcodebuild` reports that the active developer
directory is Command Line Tools, either set the active directory once:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

or run individual checks with:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild ...
```

If `xcodebuild` reports that the Xcode license has not been accepted, the owner
must run this in Terminal before native archive/build validation can continue:

```bash
sudo xcodebuild -license
```

After the license is accepted and signing is configured, run a native project
sanity check before archiving:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -list -project ios/App/App.xcodeproj
```

Expected result:

- `npm run check` passes with no errors.
- `npm run ios:check` passes build, budget, icon/splash checks, and Capacitor
  sync.
- Screenshot summary reports zero failed captures.
- `npm run audit:worlds` captures one running gameplay battlefield per campaign
  world and reports all adjacent world image distances above threshold.
- `npm run release:handoff` reports repo-side handoff artifacts are present,
  including the latest App Store screenshot summary and world visual audit
  summary, confirms those receipts are not stale against covered visual/runtime
  files, and lists only owner/App Store actions.
- `xcodebuild -list` shows the `App` project/scheme instead of Command Line
  Tools or license errors.
- Working tree contains only intentional release changes.

## Xcode And TestFlight

1. Open Xcode with `npm run open:ios`.
2. Select the signing team.
3. Confirm bundle identifier `com.scorched.earth`.
4. Confirm version `1.0` or update consistently across App Store Connect and
   Xcode.
5. Increment build number for each upload.
6. Archive with an iOS device target.
7. Upload to App Store Connect.
8. Wait for processing.
9. Add the build to internal TestFlight.
10. Install from TestFlight on at least two device sizes.
11. Run the checklist in `docs/ios-release-readiness.md`.
12. File beads for any P0/P1 device bugs before submission.

## Final Submission Gate

Do not submit for App Review until every item below is resolved:

- Public privacy policy URL is live and reachable. Current verified URL:
  `https://scorched-earth.vercel.app/privacy.html`.
- Public support URL is live and includes an appropriate contact route. Current
  verified URL: `https://scorched-earth.vercel.app/support.html`.
- App Store Connect privacy answers match the exact build behavior.
- Screenshots are uploaded for iPhone and iPad.
- App icon displays correctly in App Store Connect.
- Age rating questionnaire is complete.
- Price and availability are chosen.
- Export compliance is answered.
- App Review contact name, email, and phone are entered.
- TestFlight build has been installed and played on real iPhone and iPad
  hardware.
- Known P0/P1 issues are either fixed or explicitly accepted by the owner.
- Monetization/IAP/ads are either absent or fully configured and documented.

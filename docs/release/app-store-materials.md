# App Store Materials Draft

Generated on 2026-05-09 for local App Store submission preparation.

This file captures the submission material that can be prepared in-repo without
Apple Developer account access, TestFlight access, or unblocking monetization.
It is not a claim that the app is ready to submit.

## Source References

- App Store Connect app information fields:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/app-information>
- App Store Connect platform version fields:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information>
- App Store Connect screenshot specifications:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications>
- App Review privacy guideline 5.1.1:
  <https://developer.apple.com/app-store/review/guidelines/#privacy>

## Bundle And Build Inventory

| Field | Current value | Source |
| --- | --- | --- |
| App name | Scorched Earth | `capacitor.config.json`, `ios/App/App/Info.plist` |
| Store name draft | Scorched Earth: Synthwave | App Store name limit is 30 characters. |
| Bundle ID | `com.scorched.earth` | `capacitor.config.json`, Xcode project |
| SKU draft | `scorched-earth-synthwave-2026` | Matches `docs/ios-testflight-setup.md`. |
| Version | `1.0` native / `1.0.0` package | `ios/App/App.xcodeproj/project.pbxproj`, `package.json` |
| Build | `1` | `ios/App/App.xcodeproj/project.pbxproj` |
| Minimum iOS | 15.0 | `ios/App/App.xcodeproj/project.pbxproj` |
| Device family | iPhone and iPad | `TARGETED_DEVICE_FAMILY = "1,2"` |
| Orientation | Landscape left/right | `ios/App/App/Info.plist` |

Before submission, decide whether the App Store product name should be
`Scorched Earth: Synthwave` or whether the app should be renamed everywhere to
match `Scorched Earth: Synthwave Edition`. The full edition name is longer than
Apple's 30-character app name limit.

## App Information Draft

| App Store Connect field | Draft value | Notes |
| --- | --- | --- |
| Primary language | English (U.S.) | Existing docs assume English (U.S.). |
| Name | Scorched Earth: Synthwave | 25 characters. |
| Subtitle | Classic Artillery, Neon Style | 29 characters. |
| Primary category | Games | From TestFlight setup doc. |
| Primary subcategory | Strategy | Artillery aiming, wind, weapon choice, and terrain control are strategic. |
| Secondary subcategory | Arcade | Fast 1v1 rounds and retro presentation. |
| Content rights | Does not contain third-party content | Confirm before submission if any generated asset license terms require disclosure. |
| Made for Kids | No | Combat theme and optional future monetization make Kids category inappropriate. |
| Age rating draft | 9+ | Mild cartoon/fantasy tank violence. Final rating must come from Apple's questionnaire. |
| License agreement | Apple standard EULA | No custom EULA exists in repo. |
| Price | Product decision required | Blocked on launch/monetization strategy. |
| Availability | Product decision required | Confirm launch countries/regions in App Store Connect. |

## Platform Version Metadata Draft

### Promotional Text

Retro artillery combat with destructible terrain, neon battlefields, unlockable
tanks, supply drops, and a campaign built for quick tactical rounds.

### Description

Scorched Earth: Synthwave reimagines classic artillery combat as a neon
turn-based duel. Aim by angle and power, read the wind, choose the right weapon,
and reshape the battlefield with every shot.

Battle through escalating synthwave arenas where terrain collapses, tanks pivot
on uneven ground, and special weapons change the shape of each round. Earn stars
across campaign levels, open supply drops, unlock tank designs, and build a
collection that keeps every run moving.

Features:

- Turn-based artillery combat tuned for quick tactical rounds.
- Destructible terrain with falling dirt and persistent impact craters.
- A broad arsenal from basic shots to MIRVs, nukes, diggers, rollers, and
  precision strikes.
- Campaign levels with escalating enemy pressure and weapon complexity.
- Unlockable tanks, achievements, supply drops, and high-score chasing.
- Touch-friendly aiming, haptics, audio controls, and offline startup support.

### Keywords

artillery,tanks,retro,neon,arcade,strategy,physics,terrain,aiming,offline

This is 78 ASCII bytes. Do not duplicate the app name or developer/company name
in App Store keywords.

### Support URL

Required before submission. The URL must include a way for users to contact the
developer about app issues, feedback, and feature requests.

Current local target:

- `support.html`

Draft public URL after deployment:

- `https://scorched-earth.vercel.app/support.html`

The support page currently routes issue reports and feedback to the public
GitHub issue tracker. Confirm whether a dedicated support email, telephone
number, or legal address is required for the release regions before submission.

### Marketing URL

Optional, but recommended:

- `https://scorched-earth.vercel.app`
- Repository homepage if the deployed game is not the final marketing page.

### Privacy Policy URL

Required before submission. Apple also requires the privacy policy to be
available from inside the app.

Current local target:

- `privacy.html`

Draft public URL after deployment:

- `https://scorched-earth.vercel.app/privacy.html`

The in-app settings panel includes Privacy and Support actions that navigate to
the local pages bundled into the release build.

Minimum policy topics to confirm before submission:

- Whether the shipped iOS build uses Convex/high-score networking.
- Whether achievements, scores, supply drops, or tank collection data ever leave
  the device.
- Whether analytics, crash reporting, ads, ATT tracking, or IAP SDKs are added.
- What local storage is used for settings, progress, collection, and scores.
- Contact route for privacy requests.

### Copyright

Product/legal owner required. App Store Connect expects a year and owner name.
Draft placeholder:

`2026 Josh Daws`

### App Review Information

| Field | Draft value |
| --- | --- |
| Contact name/email/phone | Product owner input required. |
| Sign-in required | No, based on the current app. |
| Demo account | Not applicable unless online services become sign-in gated. |
| Notes | "Scorched Earth: Synthwave is a landscape iOS artillery game. The app launches offline; online high-score services are optional and should not block gameplay. No account is required." |

### Export Compliance

Draft answer from existing TestFlight guide: no custom encryption. The app may
use HTTPS for web service calls but does not implement its own cryptography.
Confirm again when the final build configuration is selected.

## Screenshot Inventory

The iOS target supports both iPhone and iPad in landscape. Apple currently
accepts one to ten screenshots per device size.

| Slot | Required status | Landscape dimensions | Notes |
| --- | --- | --- | --- |
| iPhone 6.9-inch | Preferred current iPhone top tier | `2736x1260`, `2796x1290`, or `2868x1320` | If this set is provided, 6.5-inch screenshots are not required for 6.9-inch scaling. |
| iPhone 6.5-inch | Required if 6.9-inch screenshots are not provided | `2778x1284` or `2688x1242` | Existing splash assets include `1242x2688`, but screenshots still need gameplay captures. |
| iPhone 5.5-inch | Legacy fallback source | `2208x1242` | Useful because older iPhone sizes can scale from this set. |
| iPad 13-inch | Required because the app targets iPad | `2752x2064` or `2732x2048` | iPad App Store slot should be captured separately from iPhone. |

Recommended screenshot sequence:

1. Title/menu with the logo and synthwave battlefield.
2. Gameplay HUD showing touch-friendly controls, wind, angle, power, and weapon
   selection.
3. Projectile impact with explosion, terrain destruction, and tank damage.
4. Level-complete star result.
5. Supply drop or collection screen showing unlockable tank progression.
6. Weapon/shop screen showing arsenal breadth.

Existing source captures that can guide final screenshot selection:

- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/title-menu-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/gameplay-hud-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/impact-effects-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/level-complete-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/supply-drop-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/shop-iphone-plus.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/title-menu-ipad.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/gameplay-hud-ipad.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/impact-effects-ipad.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/level-complete-ipad.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/supply-drop-ipad.png`
- `artifacts/visual-audit/2026-05-09T19-32-31-161Z/shop-ipad.png`

These visual-audit captures are validation receipts, not final App Store
screenshots. Final captures should be produced at Apple-accepted pixel sizes,
from the release build or TestFlight build, with no debug overlays.

## Icon And Launch Assets

| Asset | Status | Source |
| --- | --- | --- |
| App Store icon | Present | `assets/icons/app-icon-1024.png`; copied into `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` |
| iOS AppIcon Contents.json | Present | `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` |
| Splash source set | Present | `assets/icons/splash-*.png` |
| iOS splash image set | Present | `ios/App/App/Assets.xcassets/Splash.imageset/` |

`npm run ios:check` already verifies icon and splash presence as part of local
iOS readiness.

## External Blockers

The following remain outside this local documentation task:

- Apple Developer account membership and App Store Connect app record.
- Deployed privacy/support URLs and any additional support contact details
  required for selected release regions.
- Final product owner copyright string.
- Final pricing and availability decision.
- TestFlight build upload, physical device testing, and beta feedback.
- Any monetization/IAP/ads configuration if the deferred monetization epic is
  unblocked later.
- Final screenshots captured from a release/TestFlight build at Apple-accepted
  pixel dimensions.

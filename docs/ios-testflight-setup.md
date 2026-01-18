# iOS TestFlight Setup Guide

This guide covers setting up TestFlight beta distribution for Scorched Earth: Synthwave Edition.

## Prerequisites

- Apple Developer Account ($99/year enrollment)
- Xcode installed and configured as active developer tools
- Valid Apple ID signed into Xcode
- Build succeeded locally (`npm run build:ios`)

## 1. App Store Connect Setup

### Create New App

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in required fields:
   - **Platforms:** iOS
   - **Name:** Scorched Earth: Synthwave Edition
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** com.scorched.earth (select from dropdown)
   - **SKU:** scorched-earth-synthwave-2026
   - **User Access:** Full Access

### Configure App Information

Navigate to **App Information** tab:

| Field | Value |
|-------|-------|
| Name | Scorched Earth: Synthwave Edition |
| Subtitle | Classic Artillery, Neon Style |
| Category | Games → Strategy |
| Secondary Category | Games → Arcade |
| Content Rights | Does not contain third-party content |

### Age Rating

Complete the **Age Rating** questionnaire:
- Cartoon or Fantasy Violence: **Infrequent/Mild**
- All other categories: None

Expected rating: **4+** or **9+**

## 2. Xcode Configuration

### Set Active Developer Directory

If using Xcode but seeing command line tools errors:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Signing & Capabilities

1. Open Xcode: `npm run open:ios`
2. Select **App** project in navigator
3. Select **App** target
4. Go to **Signing & Capabilities** tab
5. Check **Automatically manage signing**
6. Select your **Team** from dropdown
7. Verify Bundle Identifier: `com.scorched.earth`

### Version Numbers

In **General** tab:
- **Version:** 1.0.0 (MARKETING_VERSION)
- **Build:** 1 (CURRENT_PROJECT_VERSION)

Increment build number for each TestFlight upload:

```bash
# In ios/App/App.xcodeproj/project.pbxproj
# Or use Xcode: General → Build → increment
```

## 3. Build and Archive

### Build for Release

1. In Xcode, select target device: **Any iOS Device (arm64)**
2. Select **Product** → **Archive**
3. Wait for archive to complete
4. Organizer window opens automatically

### Upload to App Store Connect

1. In Organizer, select the archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Upload**
5. Select options:
   - Include bitcode: Yes
   - Upload symbols: Yes
6. Wait for upload to complete

## 4. TestFlight Configuration

### Enable TestFlight

TestFlight is automatically enabled for new apps.

### Internal Testing

Internal testers are App Store Connect users with Admin, App Manager, Developer, or Marketing role.

1. Go to **TestFlight** tab in App Store Connect
2. Click **Internal Testing** in sidebar
3. Click **+** to create a new group: "Development Team"
4. Add testers by Apple ID email

Internal testing:
- Up to 100 testers
- No App Review required
- Builds available immediately after processing

### External Testing

External testers are anyone with an email address (up to 10,000).

1. Click **External Testing** in sidebar
2. Click **+** to create a group: "Beta Testers"
3. Click **Add Build** to select a processed build
4. Fill in **Test Information**:
   - Beta App Description
   - Feedback Email
   - What to Test (per build)
5. Submit for **Beta App Review**

External testing requirements:
- Requires Beta App Review (typically 24-48 hours)
- Must provide test information
- Build expires after 90 days

## 5. Build Processing

After uploading, builds go through processing:

1. **Processing** - Initial upload processing (5-15 min)
2. **Testing** - Waiting for compliance
3. **Ready to Submit** - Can distribute to testers

### Export Compliance

On first upload, you'll be asked about encryption:

- **Does your app use encryption?** No
  - The app uses HTTPS but only for web content, no custom encryption

Or if using custom encryption:
- Provide encryption documentation
- Select appropriate export compliance category

## 6. Crash Reporting

TestFlight includes automatic crash reporting:

1. Go to **TestFlight** → **Crashes**
2. View crash logs organized by build
3. Symbolicated automatically if symbols uploaded

For additional monitoring, consider:
- Firebase Crashlytics
- Sentry

## 7. Collecting Feedback

### In-App Feedback

TestFlight provides screenshot feedback:
- Testers take screenshot
- Annotate and send feedback
- View in App Store Connect

### Feedback Email

Configure feedback email in TestFlight:
- App Store Connect → TestFlight → Test Information
- Set **Feedback Email** to development team address

## Quick Reference

### Build Commands

```bash
# Full build and sync
npm run build:ios

# Quick sync (faster iteration)
npm run ios:sync

# Open Xcode
npm run open:ios
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Signing failed | Check team selection in Xcode |
| Bundle ID mismatch | Verify capacitor.config.json matches App Store Connect |
| Build number reused | Increment CURRENT_PROJECT_VERSION |
| Missing icons | Check ios/App/App/Assets.xcassets/AppIcon.appiconset |
| Export compliance | Answer encryption questions in App Store Connect |

### Build Number Management

Each TestFlight upload requires unique build number:

```bash
# Current build: check in Xcode General tab
# Increment for each upload
# Format: 1, 2, 3... (integer) or 1.0.1 (semantic)
```

## Checklist

Before each TestFlight submission:

- [ ] Run `npm run build:ios` successfully
- [ ] Increment build number
- [ ] Archive in Xcode (Any iOS Device target)
- [ ] Upload to App Store Connect
- [ ] Wait for processing
- [ ] Add build to testing group
- [ ] Submit for Beta App Review (external only)
- [ ] Notify testers

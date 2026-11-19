# State: PrayerTimes app

Branch `iom/release/v2.0`, created on 18 November 2026 from `iom/release/v1.5`, which is the published 1.5 code (Android versionCode 20, target SDK 36). It was called `iom/v1.6` until the owner made this release 2.0 everywhere.

## Done on this branch

* **Security housekeeping**: the Play upload keystore (`android/app/iom-upload.jks`), its passwords (`android/keystore.properties`) and `android/Untitled.jks` are no longer tracked. `Untitled.jks` is a byte-for-byte copy of the upload key, and has been on every branch of the public GitHub repository since the v1.0 release. All three files stay on disk for local release builds and are now ignored. Also removed: five empty junk files in the root and the `android/app/release` build outputs.
* **Special prayers** (from the new Firestore document `prayerTimes/specialPrayers`, created in the admin page):
  * They appear as special prayer cards after the built-in ones (Jumu'ah, Taraweeh, Eid). The label above the time reads "Today / اليوم", "Tomorrow / غدًا" or a date.
  * Each shows only between its "show from" and "hide after" times; the list re-checks every minute.
  * They never become the next prayer, never reach the home screen widgets, and get no notifications.
  * If the document is missing or cannot be read, the app behaves exactly like 1.5.
  * The rules live in `src/utils/specialPrayers.ts`, with 13 unit tests.
* **Gentle animations** (`src/components/motion.tsx`): cards fade up once, the next prayer breathes slowly, the countdown's prayer name fades in when it changes, and the last five minutes turn warm and pulse. All skipped when "Reduce motion" is on.
* **Tomorrow's times** (`src/components/DayToggle.tsx`): a "Today / اليوم | Tomorrow / غدًا" switch above the list. Tomorrow's list is built by exactly the same rules as today's (`src/utils/dayPrayers.ts`). Hidden if tomorrow cannot be loaded or the cached data comes from 1.5.
* **Two looks, Classic and Emerald** (owner decision, 18 November 2026):
  * Menu, "Look: Classic / Emerald". The choice is saved on the phone (`@look_preference`). **Classic is the default**, so the update changes nothing until someone chooses Emerald; making Emerald the default is one line (`DEFAULT_LOOK` in `src/contexts/ThemeContext.tsx`).
  * Emerald (`EmeraldColors` in `src/styles/colors.ts`): refined teal and emerald for light and dark. The top panel shows the date and Hijri date, a ring that fills from the previous prayer to the next (`src/components/ProgressRing.tsx`, plain views, no new native library), the countdown inside the ring and the next prayer beside it. The list has one row per prayer with Begins, Adhan and Iqama labelled once, and prayers that have started today are faded.
  * The home screen widgets and the notifications keep the Classic look.
* **Version 2.0**: Android versionCode 21 and versionName 2.0; iOS MARKETING_VERSION 2.0 and build 16 (the iOS widget extension now matches the app; it was still 1.0 and 1).

## Branch `iom/v2.0-emerald-default` (19 November 2026, from `iom/release/v2.0`)

* **Emerald is the default look** (`DEFAULT_LOOK` in `src/contexts/ThemeContext.tsx`). A look someone already chose in the menu is kept; Classic is one tap away under Menu, "Look".
* **Emerald home screen widgets**, added beside the Classic widgets (which are unchanged, so widgets already on people's home screens keep their look):
  * Android (`android/app/src/main/java/com/iomprayertimes/widget/EmeraldWidgets.kt`): "Next prayer (Emerald)" (2x2: next prayer with Begins and Iqama, then the two after it) and "Prayer day (Emerald)" (4x1: all six times, the next one highlighted). They work out the next prayer from the clock and set an inexact alarm (no new permission) to redraw just after it begins.
  * iOS (`ios/widget/EmeraldPrayerWidget.swift`, in the widget bundle): "Prayer Times (Emerald)" in small, medium and Lock Screen (rectangular) sizes, with a live countdown. The timeline has an entry after each prayer still to come today.
* **What's New pop-up**: shows once per version (`WHATS_NEW_VERSION = '2.0'` in `src/components/WhatsNewModal.tsx`), with Android and iOS specific widget entries. Before this the check was commented out and the modal was not rendered. CLAUDE.md now asks for it to be updated with every new version.

## Decisions

* Notifications for special prayers are deliberately not added: Taraweeh and Eid have none either, and the owner has not decided (improvement plan D9).
* The Wear OS app ships in this app's Play listing from the watch repository (branch `v2.0`, versionCode 36200). The Apple Watch app is built on the owner's Mac as a watchOS target inside this iOS project; see `docs/MAC_PROMPT.md`.

## Tested (18 November 2026)

* `npx tsc --noEmit`: the same 5 errors as the v1.5 baseline, none added.
* `npx jest __tests__/specialPrayers.test.ts __tests__/dayPrayers.test.ts`: 17 of 17 passed.
* ESLint on the changed files: no findings added (the same 2 errors and 4 warnings as before in the files that already had them; `App.tsx` keeps its 9).
* `npm ci` brought `node_modules` to React Native 0.83.10, as in the lockfile.
* Debug build installed and run on the Android emulator (API 36), against the live data: Classic and Emerald.
* Not yet run on iOS (the owner's Mac).

## How to test (owner)

1. Android (Windows): emulator `Medium_Phone`, then `npx react-native run-android`. Open the menu, tap "Look" to switch between Classic and Emerald; try light and dark; tap "Tomorrow / غدًا".
2. iOS (Mac): follow `docs/MAC_PROMPT.md`.
3. In the admin page, add a special prayer for today and pull to refresh: it appears under the special prayers. Delete it and refresh: it disappears. Published 1.5 apps never show it.

## Open (owner)

* Reset the Play upload key in Play Console (App integrity, App signing, "Request upload key reset"). The old key and its passwords are public in the repository history. The publisher has the store access.
* `@notifee/react-native` (all athan and iqama alerts) was archived in April 2026.
* Related branches: backend `iombe/v2.0`, TV and website `pttv/v2.0`, Wear OS watch `v2.0`.

## Branch `iom/v2.0-ring-colours` (19 November 2026, from `iom/v2.0-emerald-default`)

* The Emerald ring on the main screen turns amber (`theme.warning`) under 3 minutes before the next prayer and red (`theme.error`) under 1 minute, the same rule as the TV, the website widget and the Wear OS watch (`src/components/CountdownTimer.tsx`). The countdown text keeps its warm tint from 5 minutes. Classic is unchanged.
* `docs/MAC_PROMPT.md` asks for the same colours on the Apple Watch.
* Checked: `tsc` 5 errors (baseline), 17 of 17 tests, ESLint on the file unchanged (1 error before and after). Not yet run on a device.


# State: PrayerTimes app

Branch `iom/v1.6`, created on 18 November 2026 from `iom/release/v1.5`, which is the published 1.5 code (Android versionCode 20, target SDK 36). Nothing has been pushed.

## Done on this branch

* **Security housekeeping**: the Play upload keystore (`android/app/iom-upload.jks`), its passwords (`android/keystore.properties`) and `android/Untitled.jks` are no longer tracked. `Untitled.jks` is a byte-for-byte copy of the upload key, and has been on every branch of the public GitHub repository since the v1.0 release. All three files stay on disk for local release builds and are now ignored. Also removed: five empty junk files in the root and the `android/app/release` build outputs.
* **Special prayers** (from the new Firestore document `prayerTimes/specialPrayers`, created in the admin panel v2):
  * They appear as special prayer cards after the built-in ones (Jumu'ah, Taraweeh, Eid). The label above the time reads "Today / اليوم", "Tomorrow / غدًا" or a date.
  * Each shows only between its "show from" and "hide after" times; the list re-checks every minute.
  * They never become the next prayer, never reach the home screen widgets, and get no notifications.
  * If the document is missing or cannot be read, the app behaves exactly like 1.5.
  * The rules live in `src/utils/specialPrayers.ts`, with 13 unit tests.
* **Gentle animations** (`src/components/motion.tsx`):
  * Prayer cards fade up once when they first appear.
  * The next prayer's card has a slow breathing glow.
  * The countdown's prayer name fades in when it changes.
  * In the last five minutes the countdown turns warm and pulses slowly.
  * All of these are skipped when the phone's "Reduce motion" setting is on.
* **Tomorrow's times** (`src/components/DayToggle.tsx`):
  * A "Today / اليوم | Tomorrow / غدًا" switch above the prayer list. Tomorrow shows the next day's full list, with its Gregorian and Hijri date under the switch, and no next prayer highlight.
  * Tomorrow's list is built by exactly the same rules as today's, moved unchanged into `src/utils/dayPrayers.ts`, using tomorrow's scheduled times and the special prayers dated tomorrow.
  * The switch goes back to Today when a new day's data arrives. If tomorrow's times cannot be loaded, or the cached data comes from 1.5, the switch is hidden and the app behaves as before.
  * The home screen widgets and the notifications are unchanged.

## Decisions

* Notifications for special prayers are deliberately not added: Taraweeh and Eid have none either, and the owner has not decided (improvement plan D9).
* Version numbers are not bumped on this branch. Before uploading: Android versionCode 21 and versionName 1.6; iOS MARKETING_VERSION 1.6 and a new build number.

## Tested (18 November 2026)

* `npx tsc --noEmit`: the same 5 errors as the v1.5 baseline, none added.
* `npx jest __tests__/specialPrayers.test.ts __tests__/dayPrayers.test.ts`: 17 of 17 passed. The 4 in `dayPrayers.test.ts` cover the moved day-building rules (offsets, the scheduled, daily and fallback order, Jumu'ah, Taraweeh, Eid and special prayer rows).
* ESLint on the changed files: no findings added. `App.tsx` has the same 9 as before; the new files have none.
* Release JavaScript bundles build for Android and iOS (checked again after the tomorrow switch).
* Not yet run on an emulator or a device (the owner tests).

## How to test (owner)

1. `npm ci` (this machine's `node_modules` is still on React Native 0.83.1, while the release branch uses 0.83.10).
2. Android: `npx react-native run-android` on an emulator. iOS: on the Mac, `cd ios && pod install`, then run on a simulator.
3. In the admin panel v2 (backend branch `iombe/v1.6`), add a special prayer for today. Pull to refresh in the app: it appears under the other special prayers with "Today / اليوم". Delete it and refresh: it disappears. Published 1.5 apps never show it.
4. Tap "Tomorrow / غدًا": the list changes to tomorrow's times, with tomorrow's date under the switch. Compare with the TV review page after Isha, which shows the same day.

## Open (owner)

* Reset the Play upload key in Play Console (App integrity, App signing, "Request upload key reset"). The old key and its passwords are public in the repository history.
* Watches (owner decision, 18 November 2026): the Wear OS app now uses this app's package and is ready in the watch repository (branch `v1.1`), to be published on this listing's Wear OS track. Apple Watch comes next, as a watchOS target inside this iOS app.
* `@notifee/react-native` (all athan and iqama alerts) was archived in April 2026.
* Related branches: backend `iombe/v1.6`, TV and website `pttv/v1.6`, Wear OS watch `v1.1`.

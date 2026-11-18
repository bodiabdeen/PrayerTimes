# PrayerTimes app: working rules

React Native 0.83 app (Android and iOS) with home screen widgets. Community project for the masjid.

* New work goes on a new branch. Never commit to existing branches, and do not push unless the owner asks.
* Branch new work from the latest `iom/release/vX` branch: that is the published code. `iom/dev` lags behind it (lower versionCode, older SDK target).
* Older app versions stay installed on people's phones and read the same Firestore `prayerTimes/*` documents. Only add fields or new documents; never rename, remove or change the type of an existing field.
* The Jersey variant lives on `jersey/*` branches and is intentionally different. Never merge between the two without the owner deciding what should differ.
* Never commit signing keys, `keystore.properties`, `.p8` APNs keys or service account files. `*.jks` and `keystore.properties` are ignored.
* iOS builds need a Mac with Xcode 26 or later. On Windows, test on the Android emulator.
* Before handing over, check that nothing got worse:
  * `npx tsc --noEmit` (5 known errors at the v1.5 baseline; do not add more)
  * `npx jest __tests__/specialPrayers.test.ts`
  * `npx eslint <changed files>`
  * `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output <temp file>` (and the same for `ios`)
* The owner tests on emulators, simulators and their own devices before publishing.

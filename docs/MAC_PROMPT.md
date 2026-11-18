# Prompt for Claude Code on the Mac mini (version 2.0)

Copy everything between the two lines below into Claude Code, started in the PrayerTimes folder on the Mac.

---

You are helping me test version 2.0 of the IOM Prayer Times app (React Native 0.83, Android and iOS) on this Mac, and then build the Apple Watch app. It is a community project for our masjid. Read `CLAUDE.md`, `State.md` and this file (`docs/MAC_PROMPT.md`) before doing anything.

Rules:
* Work only on the branch `iom/release/v2.0`. Do not create, change or merge any other branch. Commit on `iom/release/v2.0` and push it when a step is finished and checked.
* Never commit signing keys, certificates, `.p8` files or passwords.
* Do not change anything in Firebase or Firestore. Do not publish to App Store Connect: I test, then the publisher releases.
* Use Xcode 26 or later. Write in plain British English with no dashes as punctuation.

## Step 1: get the branch and run the iPhone app

1. `git fetch origin` then `git checkout iom/release/v2.0` and `git pull`.
2. `npm ci`, then `cd ios && bundle install && bundle exec pod install` (or `pod install` if there is no Gemfile), then `cd ..`.
3. Run the checks from `CLAUDE.md` and tell me the results: `npx tsc --noEmit` (5 known errors), `npx jest __tests__/specialPrayers.test.ts __tests__/dayPrayers.test.ts` (17 tests), and both release bundles.
4. Start the app on an iPhone simulator: `npx react-native run-ios --simulator "iPhone 17"` (or the newest iPhone simulator installed).
5. Show me, and take simulator screenshots of:
   * Classic look (the default), light and dark (menu, "Light Mode / Dark Mode").
   * Emerald look (menu, "Look: Classic", tap to switch to Emerald), light and dark: a teal panel at the top with the date, a ring that fills towards the next prayer with the countdown inside, then one row per prayer with Begins, Adhan and Iqama.
   * "Tomorrow / غدًا" switch above the list.
   * The iOS home screen widget still works.
6. Fix only real bugs you find on iOS. Tell me what you changed.

## Step 2: build the Apple Watch app

Add a watchOS app to this iOS project (watchOS 11 or later), inside the same Xcode project and the same App Store record, so it ships with the iPhone app.

* Target names: `IOMPrayerWatch` (watch app) and `IOMPrayerWatchWidgets` (WidgetKit extension for complications). Bundle ids: `com.iomprayertimes.watchkitapp` and `com.iomprayertimes.watchkitapp.widgets`. Version 2.0, build 16, the same as the iPhone app.
* It must work on its own (no iPhone needed once installed): it downloads its own data.
* **It is a watch: the clock is the main thing.** The main screen shows the current time big in the middle, the date above it, and under it the next prayer ("Isha in 35 min") with its start and iqama times. A thin ring around the edge fills from the previous prayer to the next one. Scrolling down shows today's prayers, Jumu'ah on Fridays, visible special prayers, then tomorrow's prayers.
* Look: Emerald, the same as the Wear OS watch. True black background, emerald `#00A86B` for the ring and highlights, mint `#7FE0B5` for small labels, white text, rows in deep teal `#0E2A2D`, secondary text `#8FA6A3`.
* Complications (WidgetKit): `accessoryCircular` (a ring filling towards the next prayer, its first letters and time), `accessoryRectangular` ("Asr 13:50" and "in 25 min" with a progress bar), `accessoryInline` ("Asr 13:50"), `accessoryCorner`. Give each timeline an entry at every prayer start for the stored days, so it moves on by itself, and use a relative date text for the countdown.
* Prayer times are Isle of Man local time: always use the `Europe/London` time zone for the times in the feed, whatever zone the watch is in. Sunrise is shown in the list but is never "the next prayer".

### Data feed (already live)

`GET https://watchdata-lnqdoo43sa-nw.a.run.app/?days=7` returns JSON. Use only these fields:

```json
{
  "timeZone": "Europe/London",
  "scheduleVersion": 1,
  "days": [
    {
      "date": "2026-11-18",
      "weekday": 3,
      "hijri": "8 Jumada II 1448 AH",
      "prayers": [
        {"key": "fajr", "name": "Fajr", "apt": "05:42", "mat": "05:42", "mit": "06:30"},
        {"key": "sunrise", "name": "Sunrise", "apt": "07:52"}
      ],
      "jumuah": [{"key": "jumaa", "name": "Jumu'ah", "adhan": "13:00", "iqama": "13:20"}]
    }
  ],
  "specialPrayers": [
    {"id": "...", "name": "Qiyam al-Layl", "date": "2026-11-21", "time": "02:30", "showFrom": "2026-11-20T20:00", "hideAfter": "2026-11-21T03:30"}
  ]
}
```

* `apt` is when the prayer begins, `mat` the masjid adhan, `mit` the masjid iqama. Sunrise has only `apt`. `jumuah` is only filled on Fridays. `weekday` is 0 for Sunday to 6 for Saturday.
* A special prayer is shown only while `showFrom <= now < hideAfter` (local London time as text; an empty `showFrom` means straight away).
* Download on app launch and with background refresh about every 6 hours; keep the last good week in an App Group so the app and the complications share it and keep working offline for a week. If a download fails, keep what is stored.
* The response also has older fields (`day`, `gregorian`, `prayers` and others) for older readers; ignore them.

### Check and hand back

1. Run the watch app on an Apple Watch simulator paired with the iPhone simulator, and add each complication to a watch face. Take screenshots: the clock screen, the scrolled list, and each complication.
2. Make sure the iPhone app still builds and runs.
3. Add short notes to `State.md` ("Apple Watch" section: what was built, how it was tested, anything the publisher must do in App Store Connect).
4. Commit on `iom/release/v2.0` with a clear message and push.
5. Give me a short summary: what works, the screenshots, and anything I must check on my own iPhone and Apple Watch.

---

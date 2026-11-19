import Foundation

// The prayer data the app saves for the widgets (WidgetModule, App Group
// "group.com.iomprayertimes.widget", key "prayer_data"). It mirrors the Android SharedPreferences
// structure. Before 2.0 this lived in the Classic widget's file, which was removed in 2.0.

struct PrayerTime: Codable {
    var apt: String
    var mat: String
    var mit: String
}

struct WidgetData: Codable {
    var fajr: PrayerTime?
    var sunrise: PrayerTime?
    var dhuhr: PrayerTime?
    var asr: PrayerTime?
    var maghrib: PrayerTime?
    var isha: PrayerTime?
    var currentPrayer: String?
}

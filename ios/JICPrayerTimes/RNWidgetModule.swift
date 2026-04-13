import Foundation
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {

    let appGroupID = "group.com.jicprayertimes.widget"

    @objc
    func updateWidget(_ prayerData: NSDictionary) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            print("❌ WidgetModule: Could not access App Group UserDefaults")
            return
        }

        // Build JSON matching Android SharedPreferences structure
        var json: [String: Any] = [:]

        let prayerKeys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]

        for key in prayerKeys {
            if let prayerMap = prayerData[key] as? NSDictionary {
                json[key] = [
                    "apt": prayerMap["apt"] as? String ?? "--:--",
                    "mat": prayerMap["mat"] as? String ?? "--:--",
                    "mit": prayerMap["mit"] as? String ?? "--:--"
                ]
            }
        }

        json["currentPrayer"] = prayerData["currentPrayer"] as? String ?? ""

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: json)
            let jsonString = String(data: jsonData, encoding: .utf8)
            defaults.set(jsonString, forKey: "prayer_data")
            defaults.synchronize()

            // Reload widget timeline
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }

            print("✅ WidgetModule iOS: Updated widget data")
        } catch {
            print("❌ WidgetModule iOS: JSON error \(error)")
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

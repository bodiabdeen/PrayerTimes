import WidgetKit
import SwiftUI

@main
struct PrayerTimesWidgetBundle: WidgetBundle {
    var body: some Widget {
        PrayerTimesWidget()
        EmeraldPrayerWidget() // v2.0
    }
}

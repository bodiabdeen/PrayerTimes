import WidgetKit
import SwiftUI

// 2.0: only the Emerald widget. The Classic "Prayer Times" widget was removed (owner decision,
// 19 November 2026).
@main
struct PrayerTimesWidgetBundle: WidgetBundle {
    var body: some Widget {
        EmeraldPrayerWidget()
    }
}

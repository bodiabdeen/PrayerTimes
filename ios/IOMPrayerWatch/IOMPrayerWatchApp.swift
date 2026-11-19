// IOM Prayer Times for Apple Watch. Works on its own: it downloads its own week of times,
// keeps the last good copy for the complications, and refreshes in the background about
// every 6 hours.

import SwiftUI
import WatchKit
import WidgetKit

@main
struct IOMPrayerWatchApp: App {
    @StateObject private var model = WatchModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await model.refreshIfStale() } }
        }
        .backgroundTask(.appRefresh("feed")) {
            await FeedStore.refresh()
            WidgetCenter.shared.reloadAllTimelines()
            await WatchModel.scheduleBackgroundRefresh()
        }
    }
}

@MainActor
final class WatchModel: ObservableObject {
    @Published private(set) var feed: WatchFeed?
    @Published private(set) var loading = false

    init() {
        feed = FeedStore.load()
        Task { await refresh() }
    }

    func refreshIfStale() async {
        if FeedStore.isStale(maxAge: 30 * 60) { await refresh() }
    }

    func refresh() async {
        loading = true
        let old = feed
        feed = await FeedStore.refresh() ?? feed
        loading = false
        if feed != old { WidgetCenter.shared.reloadAllTimelines() }
        await Self.scheduleBackgroundRefresh()
    }

    static func scheduleBackgroundRefresh() async {
        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: Date().addingTimeInterval(6 * 3600), userInfo: "feed" as NSString) { _ in }
    }
}

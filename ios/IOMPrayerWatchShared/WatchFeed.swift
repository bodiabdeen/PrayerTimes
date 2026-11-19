// Shared by the Apple Watch app and its complications: the feed model, the stored copy in the
// App Group, the download, and the rules for "next prayer" and the ring colour.
// Prayer times in the feed are Isle of Man local time, so they are always read in Europe/London,
// whatever time zone the watch is in. Sunrise is listed but is never the next prayer.

import Foundation
import SwiftUI

// MARK: - Feed (GET https://watchdata-lnqdoo43sa-nw.a.run.app/?days=7)

struct WatchFeed: Codable, Equatable {
    var timeZone: String?
    var days: [FeedDay]
    var specialPrayers: [SpecialPrayer]?
}

struct FeedDay: Codable, Equatable {
    var date: String          // "2026-11-18"
    var weekday: Int?         // 0 Sunday to 6 Saturday
    var hijri: String?
    var prayers: [FeedPrayer]
    var jumuah: [FeedJumuah]?
}

struct FeedPrayer: Codable, Equatable, Identifiable {
    var key: String
    var name: String
    var apt: String           // begins
    var mat: String?          // masjid adhan
    var mit: String?          // masjid iqama
    var id: String { key }
    var isSunrise: Bool { key == "sunrise" }
}

struct FeedJumuah: Codable, Equatable, Identifiable {
    var key: String
    var name: String
    var adhan: String?
    var iqama: String?
    var id: String { key + (adhan ?? "") }
}

struct SpecialPrayer: Codable, Equatable, Identifiable {
    var id: String?
    var name: String
    var date: String
    var time: String
    var showFrom: String?
    var hideAfter: String?
}

extension SpecialPrayer {
    var stableId: String { id ?? "\(name)-\(date)-\(time)" }
}

// MARK: - London time

enum London {
    static let zone = TimeZone(identifier: "Europe/London")!

    static var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = zone
        return cal
    }

    /// "2026-11-18" and "05:42" as an instant, read in London time.
    static func date(_ day: String, _ time: String) -> Date? {
        let d = day.split(separator: "-").compactMap { Int($0) }
        let t = time.split(separator: ":").compactMap { Int($0) }
        guard d.count == 3, t.count >= 2 else { return nil }
        return calendar.date(from: DateComponents(year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1]))
    }

    /// "2026-11-20T20:00" as an instant, read in London time.
    static func dateTime(_ text: String) -> Date? {
        let parts = text.split(separator: "T")
        guard parts.count == 2 else { return nil }
        return date(String(parts[0]), String(parts[1]))
    }

    /// Today's date in London as "yyyy-MM-dd".
    static func dayKey(_ now: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: now)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}

// MARK: - Schedule

struct PrayerEvent: Equatable {
    var key: String
    var name: String
    var begins: Date
    var beginsText: String
    var iqamaText: String?
}

enum RingTone {
    case normal, soon, imminent

    /// Amber in the last 3 minutes, red in the last minute: the same rule as the phone, the
    /// Wear OS watch and the TV.
    init(secondsLeft: TimeInterval) {
        if secondsLeft < 60 { self = .imminent } else if secondsLeft < 180 { self = .soon } else { self = .normal }
    }

    var color: Color {
        switch self {
        case .normal: return WatchPalette.emerald
        case .soon: return WatchPalette.amber
        case .imminent: return WatchPalette.red
        }
    }
}

struct Schedule {
    let feed: WatchFeed

    /// Every prayer that can be "next" (sunrise left out), across all stored days, in order.
    var events: [PrayerEvent] {
        feed.days.flatMap { day in
            day.prayers.filter { !$0.isSunrise }.compactMap { p -> PrayerEvent? in
                guard let begins = London.date(day.date, p.apt) else { return nil }
                return PrayerEvent(key: p.key, name: p.name, begins: begins, beginsText: p.apt, iqamaText: p.mit)
            }
        }
        .sorted { $0.begins < $1.begins }
    }

    func next(after now: Date) -> PrayerEvent? {
        events.first { $0.begins > now }
    }

    func previous(atOrBefore now: Date) -> PrayerEvent? {
        events.last { $0.begins <= now }
    }

    /// The span the ring fills over: from the previous prayer to the next. With no previous
    /// prayer stored, the ring starts at London midnight.
    func span(at now: Date) -> ClosedRange<Date>? {
        guard let next = next(after: now) else { return nil }
        let start = previous(atOrBefore: now)?.begins ?? London.calendar.startOfDay(for: now)
        return start < next.begins ? start...next.begins : nil
    }

    func progress(at now: Date) -> Double {
        guard let span = span(at: now) else { return 0 }
        let total = span.upperBound.timeIntervalSince(span.lowerBound)
        return min(max(now.timeIntervalSince(span.lowerBound) / total, 0), 1)
    }

    func day(_ key: String) -> FeedDay? { feed.days.first { $0.date == key } }

    func today(_ now: Date) -> FeedDay? { day(London.dayKey(now)) }

    func tomorrow(_ now: Date) -> FeedDay? {
        guard let t = London.calendar.date(byAdding: .day, value: 1, to: now) else { return nil }
        return day(London.dayKey(t))
    }

    /// Special prayers shown only while showFrom <= now < hideAfter (an empty showFrom means
    /// straight away).
    func visibleSpecials(_ now: Date) -> [SpecialPrayer] {
        (feed.specialPrayers ?? []).filter { s in
            let from = s.showFrom.flatMap { $0.isEmpty ? nil : London.dateTime($0) }
            let until = s.hideAfter.flatMap { $0.isEmpty ? nil : London.dateTime($0) }
            if let from, now < from { return false }
            if let until, now >= until { return false }
            return true
        }
    }
}

// MARK: - Look (Emerald, as on the Wear OS watch)

enum WatchPalette {
    static let emerald = Color(red: 0x00 / 255, green: 0xA8 / 255, blue: 0x6B / 255)
    static let mint = Color(red: 0x7F / 255, green: 0xE0 / 255, blue: 0xB5 / 255)
    static let row = Color(red: 0x0E / 255, green: 0x2A / 255, blue: 0x2D / 255)
    static let secondary = Color(red: 0x8F / 255, green: 0xA6 / 255, blue: 0xA3 / 255)
    static let amber = Color(red: 0xF2 / 255, green: 0xA6 / 255, blue: 0x5A / 255)
    static let red = Color(red: 0xE5 / 255, green: 0x48 / 255, blue: 0x4D / 255)
}

// MARK: - Store and download

enum FeedStore {
    /// The same App Group the iPhone app and its widget already use; on the watch it is the
    /// watch's own container, shared by the watch app and its complications.
    static let appGroup = "group.com.iomprayertimes.widget"
    static let url = URL(string: "https://watchdata-lnqdoo43sa-nw.a.run.app/?days=7")!
    private static let feedKey = "watchFeed.v1"
    private static let fetchedKey = "watchFeed.fetchedAt"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    static func load() -> WatchFeed? {
        guard let data = defaults.data(forKey: feedKey) else { return nil }
        return try? JSONDecoder().decode(WatchFeed.self, from: data)
    }

    static var fetchedAt: Date? { defaults.object(forKey: fetchedKey) as? Date }

    static func isStale(_ now: Date = Date(), maxAge: TimeInterval = 6 * 3600) -> Bool {
        guard load() != nil, let at = fetchedAt else { return true }
        return now.timeIntervalSince(at) > maxAge
    }

    /// Downloads the week and stores it. If anything fails, what is stored is kept.
    @discardableResult
    static func refresh() async -> WatchFeed? {
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return load() }
            let feed = try JSONDecoder().decode(WatchFeed.self, from: data)
            guard !feed.days.isEmpty else { return load() }
            defaults.set(try JSONEncoder().encode(feed), forKey: feedKey)
            defaults.set(Date(), forKey: fetchedKey)
            return feed
        } catch {
            return load()
        }
    }
}

// MARK: - Text

enum WatchText {
    /// "in 35 min", "in 2 h 5 min", "now".
    static func untilText(_ seconds: TimeInterval) -> String {
        let minutes = Int((seconds / 60).rounded(.up))
        if minutes <= 0 { return "now" }
        if minutes < 60 { return "in \(minutes) min" }
        let h = minutes / 60, m = minutes % 60
        return m == 0 ? "in \(h) h" : "in \(h) h \(m) min"
    }

    /// First letters for the small round complication: "FAJ", "DHU", "ASR", "MAG", "ISH".
    static func short(_ name: String) -> String {
        String(name.prefix(3)).uppercased()
    }
}

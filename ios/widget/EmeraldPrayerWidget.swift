import WidgetKit
import SwiftUI

// v2.0 Emerald widget. It sits beside the Classic "Prayer Times" widget (unchanged, so widgets
// people already placed keep their look) and reads the same App Group data that WidgetModule saves.
// The timeline has an entry for each prayer still to come today, so the highlight moves on
// without opening the app.

// MARK: - Palette (EmeraldColors in src/styles/colors.ts)

private enum Emerald {
    static let top = Color(red: 0x0A / 255, green: 0x2F / 255, blue: 0x35 / 255)
    static let bottom = Color(red: 0x06 / 255, green: 0x1A / 255, blue: 0x1C / 255)
    static let accent = Color(red: 0x2B / 255, green: 0xC4 / 255, blue: 0x8A / 255)
    static let text = Color(red: 0xEA / 255, green: 0xF4 / 255, blue: 0xF1 / 255)
    static let muted = Color(red: 0x93 / 255, green: 0xAA / 255, blue: 0xA6 / 255)
    static let cell = Color.white.opacity(0.06)

    static var background: LinearGradient {
        LinearGradient(colors: [top, bottom], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// MARK: - Model

struct EmeraldPrayer: Identifiable {
    let key: String
    let label: String
    let apt: String
    let mit: String
    var id: String { key }
}

struct EmeraldEntry: TimelineEntry {
    let date: Date
    let prayers: [EmeraldPrayer]
    let nextKey: String
    let nextDate: Date?

    var next: EmeraldPrayer? { prayers.first { $0.key == nextKey } }

    /** The two entries after the next prayer, in display order (sunrise included). */
    var following: [EmeraldPrayer] {
        guard let i = prayers.firstIndex(where: { $0.key == nextKey }), !prayers.isEmpty else { return [] }
        return (1...2).map { prayers[(i + $0) % prayers.count] }
    }
}

private let emeraldOrder: [(String, String)] = [
    ("fajr", "Fajr"), ("sunrise", "Sunrise"), ("dhuhr", "Dhuhr"),
    ("asr", "Asr"), ("maghrib", "Maghrib"), ("isha", "Isha"),
]

private func emeraldTime(_ text: String, on day: Date) -> Date? {
    let parts = text.split(separator: ":")
    guard parts.count == 2,
          let h = Int(parts[0].trimmingCharacters(in: .whitespaces)),
          let m = Int(parts[1].trimmingCharacters(in: .whitespaces)) else { return nil }
    return Calendar.current.date(bySettingHour: h, minute: m, second: 0, of: day)
}

// MARK: - Timeline Provider

struct EmeraldProvider: TimelineProvider {
    let appGroupID = "group.com.iomprayertimes.widget"

    func placeholder(in context: Context) -> EmeraldEntry {
        entry(at: Date(), prayers: samplePrayers())
    }

    func getSnapshot(in context: Context, completion: @escaping (EmeraldEntry) -> Void) {
        completion(entry(at: Date(), prayers: loadPrayers() ?? samplePrayers()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<EmeraldEntry>) -> Void) {
        let now = Date()
        let prayers = loadPrayers() ?? samplePrayers()
        var entries = [entry(at: now, prayers: prayers)]
        // One more entry a minute after each prayer that is still to come today.
        for p in prayers where p.key != "sunrise" {
            if let start = emeraldTime(p.apt, on: now), start > now {
                let at = start.addingTimeInterval(60)
                entries.append(entry(at: at, prayers: prayers))
            }
        }
        // Ask again in 30 minutes, as the Classic widget does, to pick up new data.
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: now)!
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }

    private func entry(at date: Date, prayers: [EmeraldPrayer]) -> EmeraldEntry {
        for p in prayers where p.key != "sunrise" {
            if let start = emeraldTime(p.apt, on: date), start > date {
                return EmeraldEntry(date: date, prayers: prayers, nextKey: p.key, nextDate: start)
            }
        }
        // After Isha: tomorrow's Fajr (today's time is the best guess we have).
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: date)!
        let fajr = prayers.first { $0.key == "fajr" }
        let fajrDate = fajr.flatMap { emeraldTime($0.apt, on: tomorrow) }
        return EmeraldEntry(date: date, prayers: prayers, nextKey: "fajr", nextDate: fajrDate)
    }

    private func loadPrayers() -> [EmeraldPrayer]? {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let json = defaults.string(forKey: "prayer_data"),
            let data = json.data(using: .utf8),
            let decoded = try? JSONDecoder().decode(WidgetData.self, from: data)
        else { return nil }
        let byKey: [String: PrayerTime?] = [
            "fajr": decoded.fajr, "sunrise": decoded.sunrise, "dhuhr": decoded.dhuhr,
            "asr": decoded.asr, "maghrib": decoded.maghrib, "isha": decoded.isha,
        ]
        return emeraldOrder.map { key, label in
            let t = byKey[key] ?? nil
            return EmeraldPrayer(key: key, label: label, apt: t?.apt ?? "--:--", mit: t?.mit ?? "--:--")
        }
    }

    private func samplePrayers() -> [EmeraldPrayer] {
        let sample = [
            "fajr": ("06:09", "06:30"), "sunrise": ("08:18", "--:--"), "dhuhr": ("12:30", "13:15"),
            "asr": ("14:18", "14:30"), "maghrib": ("16:43", "16:48"), "isha": ("18:13", "19:30"),
        ]
        return emeraldOrder.map { key, label in
            EmeraldPrayer(key: key, label: label, apt: sample[key]!.0, mit: sample[key]!.1)
        }
    }
}

// MARK: - Views

private struct NextPrayerBlock: View {
    let entry: EmeraldEntry
    var compact = false

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("NEXT PRAYER")
                .font(.system(size: 9, weight: .bold))
                .tracking(1.2)
                .foregroundColor(Emerald.accent)
            Text(entry.next?.label ?? "")
                .font(.system(size: compact ? 20 : 24, weight: .bold))
                .foregroundColor(Emerald.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let date = entry.nextDate {
                Text(date, style: .timer)
                    .font(.system(size: 12, weight: .medium).monospacedDigit())
                    .foregroundColor(Emerald.muted)
                    .lineLimit(1)
            }
            HStack(spacing: 12) {
                TimeLabel(title: "Begins", value: entry.next?.apt ?? "--:--", highlight: false)
                if let mit = entry.next?.mit, mit != "--:--" {
                    TimeLabel(title: "Iqama", value: mit, highlight: true)
                }
            }
            .padding(.top, 2)
        }
    }
}

private struct TimeLabel: View {
    let title: String
    let value: String
    let highlight: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 9))
                .foregroundColor(Emerald.muted)
            Text(value)
                .font(.system(size: 14, weight: .bold).monospacedDigit())
                .foregroundColor(highlight ? Emerald.accent : Emerald.text)
        }
    }
}

private struct SmallView: View {
    let entry: EmeraldEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            NextPrayerBlock(entry: entry, compact: true)
            Spacer(minLength: 0)
            if let after = entry.following.first {
                HStack {
                    Text(after.label).foregroundColor(Emerald.muted)
                    Spacer()
                    Text(after.apt).foregroundColor(Emerald.text)
                }
                .font(.system(size: 11).monospacedDigit())
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct DayCell: View {
    let prayer: EmeraldPrayer
    let isNext: Bool

    var body: some View {
        VStack(spacing: 2) {
            Text(prayer.label == "Sunrise" ? "Sun" : prayer.label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(isNext ? Emerald.accent : Emerald.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(prayer.apt)
                .font(.system(size: 12, weight: .bold).monospacedDigit())
                .foregroundColor(Emerald.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if prayer.mit != "--:--" {
                Text(prayer.mit)
                    .font(.system(size: 9).monospacedDigit())
                    .foregroundColor(Emerald.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isNext ? Emerald.accent.opacity(0.2) : Emerald.cell)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isNext ? Emerald.accent : Color.clear, lineWidth: 1)
        )
    }
}

private struct MediumView: View {
    let entry: EmeraldEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.next?.label ?? "")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(Emerald.text)
                if let mit = entry.next?.mit, mit != "--:--" {
                    Text("Iqama \(mit)")
                        .font(.system(size: 12, weight: .semibold).monospacedDigit())
                        .foregroundColor(Emerald.accent)
                }
                Spacer()
                if let date = entry.nextDate {
                    Text(date, style: .timer)
                        .font(.system(size: 13, weight: .medium).monospacedDigit())
                        .foregroundColor(Emerald.muted)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 80, alignment: .trailing)
                }
            }
            HStack(spacing: 4) {
                ForEach(entry.prayers) { p in
                    DayCell(prayer: p, isNext: p.key == entry.nextKey)
                }
            }
        }
    }
}

private struct RectangularView: View {
    let entry: EmeraldEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(entry.next?.label ?? "")
                .font(.headline)
            Text("Begins \(entry.next?.apt ?? "--:--")")
                .font(.caption.monospacedDigit())
            if let mit = entry.next?.mit, mit != "--:--" {
                Text("Iqama \(mit)")
                    .font(.caption.monospacedDigit())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct EmeraldPrayerWidgetView: View {
    var entry: EmeraldEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryRectangular:
            RectangularView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        case .systemSmall:
            SmallView(entry: entry)
                .containerBackground(for: .widget) { Emerald.background }
        default:
            MediumView(entry: entry)
                .containerBackground(for: .widget) { Emerald.background }
        }
    }
}

// MARK: - Widget

struct EmeraldPrayerWidget: Widget {
    let kind: String = "EmeraldPrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: EmeraldProvider()) { entry in
            EmeraldPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Prayer Times (Emerald)")
        .description("The next prayer and today's times in the Emerald look.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

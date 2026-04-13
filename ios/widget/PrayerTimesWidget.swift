import WidgetKit
import SwiftUI

// MARK: - Data Model

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

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    let appGroupID = "group.com.jicprayertimes.widget"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), widgetData: sampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(SimpleEntry(date: Date(), widgetData: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let entry = SimpleEntry(date: Date(), widgetData: loadData())
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadData() -> WidgetData {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let json = defaults.string(forKey: "prayer_data"),
            let data = json.data(using: .utf8),
            let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data)
        else {
            return sampleData()
        }
        return widgetData
    }

    private func sampleData() -> WidgetData {
        WidgetData(
            fajr:    PrayerTime(apt: "06:09", mat: "--:--", mit: "06:30"),
            sunrise: PrayerTime(apt: "08:18", mat: "--:--", mit: "--:--"),
            dhuhr:   PrayerTime(apt: "12:30", mat: "--:--", mit: "13:25"),
            asr:     PrayerTime(apt: "14:18", mat: "--:--", mit: "14:23"),
            maghrib: PrayerTime(apt: "16:43", mat: "--:--", mit: "16:48"),
            isha:    PrayerTime(apt: "18:13", mat: "--:--", mit: "19:30"),
            currentPrayer: "dhuhr"
        )
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let widgetData: WidgetData
}

// MARK: - Prayer Column View

struct PrayerColumn: View {
    let name: String
    let apt: String
    let mit: String?
    let isCurrent: Bool

    var body: some View {
        VStack(spacing: 1) {
            Text(name)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(apt)
                .font(.system(size: 11, weight: .regular))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let mit = mit, mit != "--:--" {
                Text(mit)
                    .font(.system(size: 9))
                    .foregroundColor(Color(white: 0.8))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(isCurrent ? Color(red: 0, green: 0.87, blue: 0.52).opacity(0.3) : Color.white.opacity(0.08))
        .cornerRadius(4)
    }
}

// MARK: - Widget View

struct PrayerTimesWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    private var data: WidgetData { entry.widgetData }
    private var current: String { (data.currentPrayer ?? "").lowercased() }

    var body: some View {
        HStack(spacing: 2) {
            PrayerColumn(name: "Fajr",    apt: data.fajr?.apt    ?? "--:--", mit: data.fajr?.mit,    isCurrent: current == "fajr")
            PrayerColumn(name: "Sun",     apt: data.sunrise?.apt ?? "--:--", mit: nil,               isCurrent: current == "sunrise")
            PrayerColumn(name: "Dhuhr",   apt: data.dhuhr?.apt   ?? "--:--", mit: data.dhuhr?.mit,   isCurrent: current == "dhuhr")
            PrayerColumn(name: "Asr",     apt: data.asr?.apt     ?? "--:--", mit: data.asr?.mit,     isCurrent: current == "asr")
            PrayerColumn(name: "Magh",    apt: data.maghrib?.apt ?? "--:--", mit: data.maghrib?.mit, isCurrent: current == "maghrib")
            PrayerColumn(name: "Isha",    apt: data.isha?.apt    ?? "--:--", mit: data.isha?.mit,    isCurrent: current == "isha")
        }
        .padding(4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.1, blue: 0.2), Color(red: 0.1, green: 0.15, blue: 0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

// MARK: - Widget

struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayerTimesWidgetView(entry: entry)
        }
        .configurationDisplayName("Prayer Times")
        .description("Shows all daily prayer times.")
        .supportedFamilies([.systemMedium])
    }
}

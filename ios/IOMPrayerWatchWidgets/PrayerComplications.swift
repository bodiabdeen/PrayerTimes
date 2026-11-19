// Watch face complications: circular, rectangular, inline and corner. The rectangular one is
// also the Smart Stack card (the Apple Watch counterpart of a Wear OS tile). The timeline has an
// entry at every prayer start in the stored week, plus the moments the card rises in the Smart
// Stack (15 minutes left) and the ring turns amber (3 minutes) and red (1 minute), so it moves
// on by itself. The ring and the bar
// fill live with ProgressView(timerInterval:), and the countdown is a relative date text.

import SwiftUI
import WidgetKit

struct PrayerEntry: TimelineEntry {
    let date: Date
    let next: PrayerEvent?
    let span: ClosedRange<Date>?

    var tone: RingTone {
        guard let next else { return .normal }
        return RingTone(secondsLeft: next.begins.timeIntervalSince(date))
    }

    /// Smart Stack: in the 15 minutes before a prayer the card asks to move to the top of the
    /// stack, until the prayer begins; the rest of the time it stays where it is.
    var relevance: TimelineEntryRelevance? {
        guard let next else { return nil }
        let left = next.begins.timeIntervalSince(date)
        if left > 0, left <= Self.relevantLead {
            return TimelineEntryRelevance(score: 100, duration: left)
        }
        return TimelineEntryRelevance(score: 1)
    }

    static let relevantLead: TimeInterval = 15 * 60

    static func make(at date: Date, schedule: Schedule?) -> PrayerEntry {
        PrayerEntry(date: date, next: schedule?.next(after: date), span: schedule?.span(at: date))
    }

    static let preview = PrayerEntry(
        date: Date(),
        next: PrayerEvent(key: "asr", name: "Asr", begins: Date().addingTimeInterval(25 * 60),
                          beginsText: "13:50", iqamaText: "13:55"),
        span: Date().addingTimeInterval(-60 * 60)...Date().addingTimeInterval(25 * 60))
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry { .preview }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        if context.isPreview, FeedStore.load() == nil { return completion(.preview) }
        completion(.make(at: Date(), schedule: FeedStore.load().map(Schedule.init)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        Task {
            var feed = FeedStore.load()
            if feed == nil || FeedStore.isStale() { feed = await FeedStore.refresh() ?? feed }
            completion(Self.timeline(feed: feed, now: Date()))
        }
    }

    static func timeline(feed: WatchFeed?, now: Date) -> Timeline<PrayerEntry> {
        guard let feed else {
            return Timeline(entries: [.make(at: now, schedule: nil)], policy: .after(now.addingTimeInterval(15 * 60)))
        }
        let schedule = Schedule(feed: feed)
        var moments: Set<Date> = [now]
        for e in schedule.events where e.begins > now {
            moments.insert(e.begins)
            for lead in [PrayerEntry.relevantLead, 180.0, 60.0] {
                let t = e.begins.addingTimeInterval(-lead)
                if t > now { moments.insert(t) }
            }
        }
        let entries = moments.sorted().prefix(200).map { PrayerEntry.make(at: $0, schedule: schedule) }
        // Ask again after 6 hours to pick up a new week (or sooner if the stored days run out).
        let refresh = min(now.addingTimeInterval(6 * 3600), entries.last?.date ?? now.addingTimeInterval(3600))
        return Timeline(entries: Array(entries), policy: .after(max(refresh, now.addingTimeInterval(15 * 60))))
    }
}

// MARK: - Views

struct PrayerComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        switch family {
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .accessoryInline: inline
        case .accessoryCorner: corner
        default: rectangular
        }
    }

    private var color: Color { entry.tone.color }

    @ViewBuilder private var circular: some View {
        if let next = entry.next, let span = entry.span {
            ProgressView(timerInterval: span, countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                VStack(spacing: -1) {
                    Text(WatchText.short(next.name)).font(.system(size: 11, weight: .semibold))
                    Text(next.beginsText).font(.system(size: 12, weight: .medium)).monospacedDigit()
                }
            }
            .progressViewStyle(.circular)
            .tint(color)
            .widgetAccentable()
        } else {
            Image(systemName: "moon.stars")
        }
    }

    @ViewBuilder private var rectangular: some View {
        if let next = entry.next, let span = entry.span {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(next.name) \(next.beginsText)")
                    .font(.headline)
                    .widgetAccentable()
                (Text("in ") + Text(next.begins, style: .relative))
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                ProgressView(timerInterval: span, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .progressViewStyle(.linear)
                .tint(color)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text("Prayer Times").font(.headline)
        }
    }

    @ViewBuilder private var inline: some View {
        if let next = entry.next {
            Text("\(next.name) \(next.beginsText)")
        } else {
            Text("Prayer Times")
        }
    }

    @ViewBuilder private var corner: some View {
        if let next = entry.next, let span = entry.span {
            Text(next.beginsText)
                .font(.system(size: 14, weight: .semibold))
                .monospacedDigit()
                .widgetAccentable()
                .widgetLabel {
                    ProgressView(timerInterval: span, countsDown: false) {
                        Text(next.name)
                    } currentValueLabel: {
                        EmptyView()
                    }
                    .tint(color)
                }
        } else {
            Image(systemName: "moon.stars")
        }
    }
}

// MARK: - Widget

struct PrayerComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "IOMPrayerComplication", provider: PrayerProvider()) { entry in
            PrayerComplicationView(entry: entry)
                .containerBackground(for: .widget) { Color.black }
        }
        .configurationDisplayName("Next prayer")
        .description("The next prayer, its time and how long until it begins.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

@main
struct PrayerComplicationsBundle: WidgetBundle {
    var body: some Widget {
        PrayerComplication()
    }
}

// The watch is a clock first: the time big in the middle, the date above, the next prayer
// below, and a thin ring round the edge that fills from the previous prayer to the next.
// Scrolling down shows today's prayers, Jumu'ah on Fridays, visible special prayers, then
// tomorrow's prayers.

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: WatchModel

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let now = context.date
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: 6) {
                        ClockScreen(now: now, schedule: model.feed.map(Schedule.init), loading: model.loading)
                            .frame(height: geo.size.height)
                        if let feed = model.feed {
                            PrayerList(now: now, schedule: Schedule(feed: feed))
                                .padding(.horizontal, 6)
                        }
                    }
                }
                .scrollIndicators(.hidden)
            }
            // The whole screen, so the ring follows the display's edge.
            .ignoresSafeArea()
        }
        .background(Color.black)
        // The app shows its own big clock, so the small system time is hidden.
        .persistentSystemOverlays(.hidden)
    }
}

// MARK: - Clock screen

private struct ClockScreen: View {
    let now: Date
    let schedule: Schedule?
    let loading: Bool

    var body: some View {
        let next = schedule?.next(after: now)
        let left = next.map { $0.begins.timeIntervalSince(now) } ?? .infinity
        let tone = RingTone(secondsLeft: left)

        ZStack {
            EdgeRing(progress: schedule?.progress(at: now) ?? 0, color: tone.color)
                .ignoresSafeArea()

            VStack(spacing: 2) {
                Text(now, format: .dateTime.weekday(.abbreviated).day().month(.abbreviated))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(WatchPalette.mint)
                if let hijri = schedule?.today(now)?.hijri {
                    Text(hijri.replacingOccurrences(of: " AH", with: ""))
                        .font(.system(size: 11))
                        .foregroundStyle(WatchPalette.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Text(now, format: .dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
                    .font(.system(size: 52, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.6)
                    .padding(.vertical, -2)

                if let next {
                    Text("\(next.name) \(WatchText.untilText(left))")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(tone == .normal ? WatchPalette.emerald : tone.color)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    HStack(spacing: 8) {
                        label("Begins", next.beginsText)
                        if let iqama = next.iqamaText { label("Iqama", iqama) }
                    }
                } else {
                    Text(loading ? "Loading times…" : "No times stored")
                        .font(.system(size: 14))
                        .foregroundStyle(WatchPalette.secondary)
                }
            }
            .padding(.horizontal, 10)
        }
    }

    private func label(_ title: String, _ value: String) -> some View {
        HStack(spacing: 3) {
            Text(title).foregroundStyle(WatchPalette.secondary)
            Text(value).foregroundStyle(.white).monospacedDigit()
        }
        .font(.system(size: 12))
    }
}

/// A thin ring following the screen's rounded edge, starting at the top centre and filling
/// clockwise. The unfilled part stays faintly visible.
private struct EdgeRing: View {
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            RoundedEdge().stroke(Color.white.opacity(0.12), lineWidth: 4)
            RoundedEdge().trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .animation(.easeInOut(duration: 0.6), value: progress)
        }
        .padding(3)
    }
}

private struct RoundedEdge: Shape {
    func path(in rect: CGRect) -> Path {
        let r = min(rect.width, rect.height) * 0.26
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))
        p.addArc(center: CGPoint(x: rect.maxX - r, y: rect.minY + r), radius: r,
                 startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - r))
        p.addArc(center: CGPoint(x: rect.maxX - r, y: rect.maxY - r), radius: r,
                 startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        p.addLine(to: CGPoint(x: rect.minX + r, y: rect.maxY))
        p.addArc(center: CGPoint(x: rect.minX + r, y: rect.maxY - r), radius: r,
                 startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + r))
        p.addArc(center: CGPoint(x: rect.minX + r, y: rect.minY + r), radius: r,
                 startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        p.closeSubpath()
        return p
    }
}

// MARK: - List

private struct PrayerList: View {
    let now: Date
    let schedule: Schedule

    var body: some View {
        let nextKey = schedule.next(after: now)
        VStack(alignment: .leading, spacing: 4) {
            if let today = schedule.today(now) {
                header("Today")
                columns
                ForEach(today.prayers) { p in
                    let begins = London.date(today.date, p.apt)
                    PrayerRow(name: p.name, begins: p.apt, iqama: p.mit,
                              isNext: nextKey?.begins == begins && nextKey?.key == p.key,
                              isPast: (begins ?? .distantFuture) <= now && !(nextKey?.key == p.key))
                }
                ForEach(today.jumuah ?? []) { j in
                    PrayerRow(name: j.name, begins: j.adhan ?? "", iqama: j.iqama, isNext: false, isPast: false)
                }
            }

            let specials = schedule.visibleSpecials(now)
            if !specials.isEmpty {
                header("Special prayers")
                ForEach(specials, id: \.stableId) { s in
                    PrayerRow(name: s.name, begins: s.time, iqama: nil, isNext: false, isPast: false,
                              note: s.date == London.dayKey(now) ? nil : shortDate(s.date))
                }
            }

            if let tomorrow = schedule.tomorrow(now) {
                header("Tomorrow")
                ForEach(tomorrow.prayers) { p in
                    PrayerRow(name: p.name, begins: p.apt, iqama: p.mit, isNext: false, isPast: false)
                }
                ForEach(tomorrow.jumuah ?? []) { j in
                    PrayerRow(name: j.name, begins: j.adhan ?? "", iqama: j.iqama, isNext: false, isPast: false)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 12)
    }

    private func header(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(WatchPalette.mint)
            .padding(.top, 8)
            .padding(.leading, 4)
    }

    private var columns: some View {
        HStack {
            Spacer()
            Text("Begins").frame(width: 46, alignment: .trailing)
            Text("Iqama").frame(width: 46, alignment: .trailing)
        }
        .font(.system(size: 10))
        .foregroundStyle(WatchPalette.secondary)
        .padding(.horizontal, 8)
    }

    private func shortDate(_ key: String) -> String? {
        guard let d = London.date(key, "12:00") else { return nil }
        let f = DateFormatter()
        f.timeZone = London.zone
        f.dateFormat = "EEE d MMM"
        return f.string(from: d)
    }
}

private struct PrayerRow: View {
    let name: String
    let begins: String
    let iqama: String?
    let isNext: Bool
    let isPast: Bool
    var note: String? = nil

    var body: some View {
        HStack(spacing: 4) {
            VStack(alignment: .leading, spacing: 0) {
                Text(name)
                    .font(.system(size: 15, weight: isNext ? .bold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if let note {
                    Text(note).font(.system(size: 10)).foregroundStyle(WatchPalette.secondary)
                }
            }
            Spacer(minLength: 2)
            Text(begins).frame(width: 46, alignment: .trailing)
            Text(iqama ?? "").frame(width: 46, alignment: .trailing)
                .foregroundStyle(isNext ? WatchPalette.mint : .white)
        }
        .font(.system(size: 14, weight: isNext ? .semibold : .regular))
        .monospacedDigit()
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isNext ? WatchPalette.emerald.opacity(0.28) : WatchPalette.row)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isNext ? WatchPalette.emerald : .clear, lineWidth: 1.5)
        )
        .opacity(isPast ? 0.5 : 1)
    }
}

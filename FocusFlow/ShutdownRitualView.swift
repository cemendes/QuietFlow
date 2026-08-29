import SwiftUI

// MARK: - Shutdown Ritual View

struct ShutdownRitualView: View {
    @Environment(TasksManager.self) var tasksManager: TasksManager
    @State private var currentStep = 1
    private let totalSteps = 3

    // Step 1 – Review
    // (uses tasksManager.tasks filtered to completed today)

    // Step 2 – Reflect
    @State private var reflectionText: String = ""
    @State private var rating: Int = 0         // 1–5 stars

    // MARK: - Computed

    private var completedToday: [TaskItem] {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        let todayStr = fmt.string(from: Date())
        let yesterdayStr = fmt.string(from: Calendar.current.date(byAdding: .day, value: -1, to: Date())!)
        
        return tasksManager.tasks.filter { task in
            task.status == "completed" && (task.date == todayStr || task.date == yesterdayStr)
        }
    }

    private var incompleteToday: [TaskItem] {
        tasksManager.tasks.filter {
            $0.status != "completed" &&
            $0.parentTaskId == nil
        }
    }

    private var scheduledEvents: [CalendarEvent] {
        tasksManager.calendarEvents
            .filter { !$0.isAllDay }
            .sorted { ($0.startHour * 60 + $0.startMinute) < ($1.startHour * 60 + $1.startMinute) }
    }

    private var savedIntention: String {
        UserDefaults.standard.string(forKey: "dailyIntention") ?? ""
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            headerView

            Divider()

            Group {
                switch currentStep {
                case 1: stepOneView()
                case 2: stepTwoView()
                case 3: stepThreeView()
                default: EmptyView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()

            footerView
        }
        .frame(width: 900, height: 660)
        .keyboardShortcut(.escape, modifiers: [])
        .onExitCommand { tasksManager.completeShutdownRitual() }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.staleAmber.opacity(0.12)).frame(width: 38, height: 38)
                Image(systemName: "moon.stars.fill")
                    .font(.system(size: 20)).foregroundStyle(.staleAmber)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("Daily Shutdown")
                    .font(.system(size: 18, weight: .bold)).foregroundStyle(.textPrimary)
                Text("Step \(currentStep) of \(totalSteps)")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(.textSecondary)
            }
            Spacer()
            // Progress pills
            HStack(spacing: 6) {
                ForEach(1...totalSteps, id: \.self) { step in
                    Capsule()
                        .fill(step <= currentStep ? Color.staleAmber : Color.borderGray.opacity(0.5))
                        .frame(width: step == currentStep ? 24 : 16, height: 4)
                        .animation(.easeInOut(duration: 0.2), value: currentStep)
                }
            }
            Button { tasksManager.completeShutdownRitual() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.textSecondary)
                    .padding(6).background(Color.borderGray.opacity(0.5)).clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 28).padding(.vertical, 18)
    }

    // MARK: - Footer

    private var footerView: some View {
        HStack {
            if currentStep > 1 && currentStep < totalSteps {
                Button { withAnimation { currentStep -= 1 } } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.system(size: 13, weight: .medium)).foregroundStyle(.textSecondary)
                    .padding(.vertical, 8).padding(.horizontal, 14)
                    .background(Color.secondarySurface).clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            Spacer()
            if currentStep < totalSteps {
                Button { withAnimation { currentStep += 1 } } label: {
                    HStack(spacing: 5) {
                        Text("Next")
                        Image(systemName: "chevron.right")
                    }
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(.white)
                    .padding(.vertical, 8).padding(.horizontal, 18)
                    .background(Color.staleAmber).clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 28).padding(.vertical, 16)
        .background(Color.sidebarBackground)
    }

    // MARK: - Step 1: Review

    @ViewBuilder
    private func stepOneView() -> some View {
        HStack(alignment: .top, spacing: 0) {

            // ── Left: Completed tasks ────────────────────────────────
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(.successGreen)
                        Text("Completed")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.textPrimary)
                    }
                    Text(completedToday.isEmpty
                         ? "Nothing completed yet — that's okay."
                         : "\(completedToday.count) task\(completedToday.count == 1 ? "" : "s") done. Great work.")
                        .font(.system(size: 12))
                        .foregroundStyle(.textSecondary)
                }
                .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 14)

                Divider()

                ScrollView {
                    VStack(spacing: 6) {
                        if completedToday.isEmpty {
                            emptyState(icon: "checkmark.circle", message: "No completed tasks today.")
                        } else {
                            ForEach(completedToday) { task in
                                taskReviewRow(
                                    task: task,
                                    icon: "checkmark.circle.fill",
                                    iconColor: .successGreen,
                                    strikethrough: true
                                )
                            }
                        }
                    }
                    .padding(16)
                }
                .background(Color.surfaceBackground)
            }
            .frame(maxWidth: .infinity)

            Divider()

            // ── Right: Incomplete / not done ──────────────────────────
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "circle.dotted")
                            .font(.system(size: 16))
                            .foregroundStyle(.staleAmber)
                        Text("Not Done")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.textPrimary)
                    }
                    Text(incompleteToday.isEmpty
                         ? "Everything done — you crushed it!"
                         : "\(incompleteToday.count) task\(incompleteToday.count == 1 ? "" : "s") carried forward.")
                        .font(.system(size: 12))
                        .foregroundStyle(.textSecondary)
                }
                .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 14)

                Divider()

                ScrollView {
                    VStack(spacing: 6) {
                        if incompleteToday.isEmpty {
                            emptyState(icon: "star.fill", message: "Perfect day — all done!")
                        } else {
                            ForEach(incompleteToday) { task in
                                taskReviewRow(
                                    task: task,
                                    icon: "circle",
                                    iconColor: .staleAmber,
                                    strikethrough: false
                                )
                            }
                        }
                    }
                    .padding(16)
                }
                .background(Color.surfaceBackground)
            }
            .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func taskReviewRow(task: TaskItem, icon: String, iconColor: Color, strikethrough: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .font(.system(size: 14))
            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(strikethrough ? .textSecondary : .textPrimary)
                    .strikethrough(strikethrough)
                    .lineLimit(1)
                if let d = task.details, !d.isEmpty {
                    Text(d).font(.system(size: 11))
                        .foregroundStyle(.textSecondary).lineLimit(1)
                }
            }
            Spacer()
            HStack(spacing: 3) {
                Image(systemName: task.source.iconName).font(.system(size: 9))
            }
            .foregroundStyle(task.source.color)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(task.source.color.opacity(0.08))
            .clipShape(.rect(cornerRadius: 4))
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(Color.secondarySurface)
        .clipShape(.rect(cornerRadius: 8))
    }

    @ViewBuilder
    private func shutdownCalendarRow(hour: Int) -> some View {
        let eventsInHour = scheduledEvents.filter { $0.startHour == hour }
        HStack(alignment: .top, spacing: 6) {
            Text(String(format: "%d:00", hour))
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundStyle(.textSecondary.opacity(0.6))
                .frame(width: 32, alignment: .trailing)

            ZStack(alignment: .top) {
                Rectangle().fill(Color.borderGray.opacity(0.3))
                    .frame(height: 0.5).frame(maxWidth: .infinity)

                if !eventsInHour.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(eventsInHour) { event in
                            let done = event.isCompleted
                            HStack(spacing: 4) {
                                if done {
                                    Image(systemName: "checkmark").font(.system(size: 7, weight: .bold))
                                }
                                Text(event.title.replacingOccurrences(of: "[FocusFlow] ", with: ""))
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(.white).lineLimit(1)
                            }
                            .padding(.horizontal, 5).padding(.vertical, 3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(done ? Color.successGreen : Color(hex: "#5C6BC0"))
                            .clipShape(.rect(cornerRadius: 4))
                        }
                    }
                    .padding(.top, 1)
                }
            }
        }
        .frame(height: 34)
        .padding(.horizontal, 10)
    }

    // MARK: - Step 2: Reflect

    @ViewBuilder
    private func stepTwoView() -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("How did your day go?")
                    .font(.system(size: 22, weight: .bold)).foregroundStyle(.textPrimary)
                Text("Reflect briefly — this takes 30 seconds and makes tomorrow better.")
                    .font(.system(size: 13)).foregroundStyle(.textSecondary)
            }
            .padding(.horizontal, 28).padding(.top, 22).padding(.bottom, 20)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // Intention echo
                    if !savedIntention.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your intention was:")
                                .font(.system(size: 11, weight: .semibold)).foregroundStyle(.textSecondary)
                            Text("“\(savedIntention)”")
                                .font(.system(size: 14, weight: .medium)).foregroundStyle(.textPrimary)
                                .italic()
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.googleBlue.opacity(0.05))
                                .clipShape(.rect(cornerRadius: 8))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.googleBlue.opacity(0.2), lineWidth: 1)
                                }
                        }
                    }

                    // Day rating
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Rate your day")
                            .font(.system(size: 11, weight: .semibold)).foregroundStyle(.textSecondary)
                        HStack(spacing: 8) {
                            ForEach(1...5, id: \.self) { star in
                                Button { rating = star } label: {
                                    Image(systemName: star <= rating ? "star.fill" : "star")
                                        .font(.system(size: 24))
                                        .foregroundStyle(star <= rating ? .staleAmber : .borderGray)
                                }
                                .buttonStyle(.plain)
                            }
                            Spacer()
                            if rating > 0 {
                                Text(ratingLabel)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.textSecondary)
                            }
                        }
                    }

                    // Free-form reflection
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Anything to carry into tomorrow?")
                            .font(.system(size: 11, weight: .semibold)).foregroundStyle(.textSecondary)
                        TextField("e.g. Finish the proposal", text: $reflectionText, axis: .vertical)
                            .font(.system(size: 13))
                            .foregroundStyle(.textPrimary)
                            .lineLimit(5...)
                            .padding(10)
                            .background(Color.secondarySurface)
                            .clipShape(.rect(cornerRadius: 8))
                            .overlay {
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.borderGray, lineWidth: 1)
                            }
                    }
                }
                .padding(28)
            }
            .background(Color.surfaceBackground)
        }
    }

    private var ratingLabel: String {
        switch rating {
        case 1: return "Rough day"
        case 2: return "Below average"
        case 3: return "Solid"
        case 4: return "Great day"
        case 5: return "Outstanding!"
        default: return ""
        }
    }

    // MARK: - Step 3: Done

    @ViewBuilder
    private func stepThreeView() -> some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 20) {
                ZStack {
                    Circle().fill(Color.successGreen.opacity(0.1)).frame(width: 80, height: 80)
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 40)).foregroundStyle(.staleAmber)
                }

                VStack(spacing: 8) {
                    Text("You're done for the day.")
                        .font(.system(size: 26, weight: .bold)).foregroundStyle(.textPrimary)
                    Text("Step away. Rest. Tomorrow you'll start fresh.")
                        .font(.system(size: 14)).foregroundStyle(.textSecondary)
                }

                // Stats summary
                HStack(spacing: 0) {
                    summaryCell(icon: "checkmark.circle.fill", value: "\(completedToday.count)", label: "completed", color: .successGreen)
                    Divider().frame(height: 44)
                    summaryCell(icon: "calendar",             value: "\(scheduledEvents.count)", label: "events",    color: .gchatBlue)
                    Divider().frame(height: 44)
                    summaryCell(icon: "clock",                value: "\(busyMinutes / 60)h \(busyMinutes % 60)m", label: "in meetings", color: .staleAmber)
                }
                .background(Color.secondarySurface)
                .clipShape(.rect(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12).stroke(Color.borderGray, lineWidth: 1)
                }
                .frame(maxWidth: 440)

                Button {
                    tasksManager.completeShutdownRitual()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "moon.zzz.fill")
                        Text("Close FocusFlow")
                    }
                    .font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                    .padding(.vertical, 11).padding(.horizontal, 28)
                    .background(Color.staleAmber).clipShape(.rect(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
            .multilineTextAlignment(.center)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .background(Color.surfaceBackground)
    }

    @ViewBuilder
    private func summaryCell(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 18)).foregroundStyle(color)
            Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(.textPrimary)
            Text(label).font(.system(size: 11)).foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
    }

    // MARK: - Helpers

    private var busyMinutes: Int {
        scheduledEvents.reduce(0) { acc, e in
            acc + max(0, (e.endHour * 60 + e.endMinute) - (e.startHour * 60 + e.startMinute))
        }
    }

    @ViewBuilder
    private func emptyState(icon: String, message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).foregroundStyle(.textSecondary.opacity(0.5)).font(.system(size: 18))
            Text(message).font(.system(size: 13)).foregroundStyle(.textSecondary)
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondarySurface).clipShape(.rect(cornerRadius: 8))
    }
}

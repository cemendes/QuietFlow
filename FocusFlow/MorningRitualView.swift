import SwiftUI

struct MorningRitualView: View {
    @Environment(TasksManager.self) var tasksManager: TasksManager
    @State private var currentStep = 1
    private let totalSteps = 2

    // Step 1 — tap-to-select (no default; unselected = defer to tomorrow)
    @State private var todayTaskIds: Set<String> = []

    // Step 2
    @State private var expandedTaskId: String? = nil
    @State private var promotedTaskIds: Set<String> = []
    @State private var dailyIntention: String = ""
    @State private var draggingTaskId: String? = nil
    @State private var isUnscheduleTargeted = false

    // MARK: - Computed

    private var unreviewedTasks: [TaskItem] {
        tasksManager.tasks.filter { task in
            task.status != "completed" &&
            task.parentTaskId == nil &&
            !tasksManager.calendarEvents.contains(where: { ev in ev.taskId == task.id })
        }
    }

    private var todayTasks: [TaskItem] {
        tasksManager.tasks.filter { task in
            task.status != "completed" &&
            task.parentTaskId == nil &&
            todayTaskIds.contains(task.id)
        }
    }

    private var selectedTasks: [TaskItem] {
        todayTasks.filter { promotedTaskIds.contains($0.id) }
    }

    private var todayEvents: [CalendarEvent] {
        tasksManager.calendarEvents
            .filter { !$0.isAllDay }
            .sorted { ($0.startHour * 60 + $0.startMinute) < ($1.startHour * 60 + $1.startMinute) }
    }

    private var busyMinutes: Int {
        todayEvents.reduce(0) { acc, e in
            acc + max(0, (e.endHour * 60 + e.endMinute) - (e.startHour * 60 + e.startMinute))
        }
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
                default: EmptyView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()

            footerView
        }
        .frame(width: 900, height: 660)
        .onAppear { promotedTaskIds = [] }
        .onExitCommand { tasksManager.skipMorningRitual() }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.googleBlue.opacity(0.12)).frame(width: 38, height: 38)
                Image(systemName: "bolt.circle.fill")
                    .font(.system(size: 22)).foregroundStyle(.googleBlue)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("Morning Ritual")
                    .font(.system(size: 18, weight: .bold)).foregroundStyle(.textPrimary)
                Text("Step \(currentStep) of \(totalSteps)")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(.textSecondary)
            }
            Spacer()
            // Progress pills
            HStack(spacing: 6) {
                ForEach(1...totalSteps, id: \.self) { step in
                    Capsule()
                        .fill(step <= currentStep ? Color.googleBlue : Color.borderGray.opacity(0.5))
                        .frame(width: step == currentStep ? 24 : 16, height: 4)
                        .animation(.easeInOut(duration: 0.2), value: currentStep)
                }
            }
            Button { tasksManager.skipMorningRitual() } label: {
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
            if currentStep > 1 {
                Button { withAnimation { currentStep -= 1 } } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.system(size: 13, weight: .medium)).foregroundStyle(.textSecondary)
                    .padding(.vertical, 8).padding(.horizontal, 14)
                    .background(Color.secondarySurface).cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            Spacer()
            if currentStep < totalSteps {
                Button {
                    if currentStep == 1 {
                        // Pre-select all today tasks going into Step 2
                        promotedTaskIds = todayTaskIds
                    }
                    withAnimation { currentStep += 1 }
                } label: {
                    HStack(spacing: 5) {
                        if currentStep == 1 && !todayTaskIds.isEmpty {
                            Text("Next (\(todayTaskIds.count) selected)")
                        } else {
                            Text("Next Step")
                        }
                        Image(systemName: "chevron.right")
                    }
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(.white)
                    .padding(.vertical, 8).padding(.horizontal, 18)
                    .background(Color.googleBlue).clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("NextStepButton")
            } else {
                Button {
                    if !dailyIntention.isEmpty {
                        UserDefaults.standard.set(dailyIntention, forKey: "dailyIntention")
                    }
                    
                    // Auto-schedule promoted tasks that are NOT manually scheduled on the calendar
                    let alreadyScheduledIds = Set(tasksManager.calendarEvents.compactMap { $0.taskId })
                    let autoScheduleIds = promotedTaskIds.subtracting(alreadyScheduledIds)
                    for id in autoScheduleIds {
                        tasksManager.scheduleTaskAuto(id: id)
                    }
                    
                    // Defer everything NOT selected in Step 1 (todayTaskIds) to tomorrow
                    let deferredIds = Set(unreviewedTasks.map { $0.id }).subtracting(todayTaskIds)
                    tasksManager.deferTasksToTomorrow(ids: deferredIds)
                    tasksManager.completeMorningRitual()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "sunrise.fill")
                        Text("Start My Day")
                    }
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                    .padding(.vertical, 8).padding(.horizontal, 18)
                    .background(Color.successGreen).clipShape(.rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 28).padding(.vertical, 16)
        .background(Color.sidebarBackground)
    }

    // MARK: - Step 1: Overnight Review

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let first = tasksManager.userName.components(separatedBy: " ").first ?? "there"
        switch hour {
        case 5..<12: return "Good morning, \(first)."
        case 12..<17: return "Good afternoon, \(first)."
        default:     return "Good evening, \(first)."
        }
    }

    @ViewBuilder
    private func stepOneView() -> some View {
        VStack(alignment: .leading, spacing: 0) {

            // Greeting banner
            VStack(alignment: .leading, spacing: 4) {
                Text(greetingText)
                    .font(.system(size: 22, weight: .bold)).foregroundStyle(.textPrimary)
                Text(unreviewedTasks.isEmpty
                     ? "Your backlog is clear. Let's make today count."
                     : "Tap the tasks you want to tackle today. Everything else moves to tomorrow.")
                    .font(.system(size: 13)).foregroundStyle(.textSecondary)
            }
            .padding(.horizontal, 28).padding(.top, 22).padding(.bottom, 16)

            // Stats strip
            if !unreviewedTasks.isEmpty {
                HStack(spacing: 0) {
                    statPill(icon: "tray.fill",  label: "\(unreviewedTasks.count) tasks",         color: .googleBlue)
                    Divider().frame(height: 28)
                    statPill(icon: "calendar",   label: "\(todayEvents.count) meetings today",    color: .gchatBlue)
                    Divider().frame(height: 28)
                    statPill(icon: "clock",      label: "\(busyMinutes / 60)h \(busyMinutes % 60)m busy", color: .staleAmber)
                }
                .background(Color.secondarySurface)
                .overlay(Divider(), alignment: .bottom)
            }

            Divider()

            ScrollView {
                VStack(spacing: 6) {
                    if unreviewedTasks.isEmpty {
                        emptyState(icon: "tray", message: "No new tasks. You're all caught up!")
                    } else {
                        ForEach(unreviewedTasks) { task in
                            let isSelected = todayTaskIds.contains(task.id)
                            HStack(spacing: 12) {
                                // Selection indicator
                                ZStack {
                                    RoundedRectangle(cornerRadius: 5)
                                        .stroke(isSelected ? Color.googleBlue : Color.borderGray.opacity(0.6), lineWidth: 1.5)
                                        .frame(width: 20, height: 20)
                                    if isSelected {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(Color.googleBlue)
                                    }
                                }

                                // Source dot
                                Circle().fill(task.source.color).frame(width: 7, height: 7)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(task.title)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(isSelected ? .textPrimary : .textSecondary)
                                        .lineLimit(1)
                                    if let d = task.details, !d.isEmpty {
                                        Text(d)
                                            .font(.system(size: 11))
                                            .foregroundStyle(.textSecondary)
                                            .lineLimit(1)
                                    }
                                }

                                Spacer()

                                if let dur = task.duration {
                                    Text("\(dur)m")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.textTertiary)
                                }
                            }
                            .padding(.horizontal, 14).padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(isSelected ? Color.googleBlue.opacity(0.05) : Color.secondarySurface)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(isSelected ? Color.googleBlue.opacity(0.35) : Color.clear, lineWidth: 1.5)
                                    )
                            )
                            .contentShape(Rectangle())
                            .onTapGesture {
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    if isSelected { todayTaskIds.remove(task.id) }
                                    else { todayTaskIds.insert(task.id) }
                                }
                            }
                        }
                    }
                }
                .padding(28)
            }
            .background(Color.surfaceBackground)
        }
    }

    // MARK: - Step 2: Task Selection + Calendar Sidebar

    @ViewBuilder
    private func stepTwoView() -> some View {
        HStack(alignment: .top, spacing: 0) {

            // ── Left: Task List (40%) ─────────────────────────
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Select Your Tasks")
                            .font(.system(size: 13, weight: .bold)).foregroundStyle(.textPrimary)
                        Text("Choose what you'll work on today")
                            .font(.system(size: 11)).foregroundStyle(.textSecondary)
                    }
                    Spacer()
                    if !promotedTaskIds.isEmpty {
                        Text("\(promotedTaskIds.count) selected")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.googleBlue)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Color.googleBlue.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 10))
                    }
                }
                .padding(.horizontal, 14).padding(.top, 14).padding(.bottom, 8)

                // Daily intention field
                VStack(alignment: .leading, spacing: 4) {
                    Text("What's your #1 focus today?")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.textSecondary)
                    TextField("e.g. Close the Privia deal", text: $dailyIntention)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .foregroundStyle(.textPrimary)
                        .padding(.horizontal, 10).padding(.vertical, 7)
                        .background(Color.googleBlue.opacity(0.05))
                        .overlay {
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(dailyIntention.isEmpty ? Color.borderGray : Color.googleBlue.opacity(0.4), lineWidth: 1)
                        }
                        .clipShape(.rect(cornerRadius: 6))
                }
                .padding(.horizontal, 14).padding(.bottom, 10)

                Divider()

                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(todayTasks) { task in
                            let isSelected = promotedTaskIds.contains(task.id)
                            let isExpanded = expandedTaskId == task.id

                            VStack(alignment: .leading, spacing: 0) {
                                // Main row — entire card taps to expand
                                HStack(spacing: 8) {
                                    Button {
                                        if isSelected { promotedTaskIds.remove(task.id) }
                                        else { promotedTaskIds.insert(task.id) }
                                    } label: {
                                        Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                                            .font(.system(size: 14))
                                            .foregroundStyle(isSelected ? .googleBlue : .borderGray)
                                    }
                                    .buttonStyle(.plain)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(task.title)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(.textPrimary).lineLimit(1)
                                        HStack(spacing: 4) {
                                            HStack(spacing: 2) {
                                                Image(systemName: task.source.iconName)
                                                    .font(.system(size: 8))
                                                Text(task.source.label)
                                                    .font(.system(size: 9, weight: .medium))
                                            }
                                            .foregroundStyle(task.source.color)
                                            .padding(.horizontal, 5).padding(.vertical, 1)
                                            .background(task.source.color.opacity(0.1))
                                            .clipShape(.rect(cornerRadius: 3))

                                            if let p = task.priority, !p.isEmpty {
                                                Text(p.uppercased())
                                                    .font(.system(size: 8, weight: .bold))
                                                    .foregroundStyle(p.lowercased() == "high" ? .gmailRed : .staleAmber)
                                                    .padding(.horizontal, 4).padding(.vertical, 1)
                                                    .background((p.lowercased() == "high" ? Color.gmailRed : Color.staleAmber).opacity(0.1))
                                                    .clipShape(.rect(cornerRadius: 3))
                                            }

                                            // Duration badge
                                            let dur = task.duration ?? tasksManager.defaultDuration
                                            HStack(spacing: 2) {
                                                Image(systemName: "clock")
                                                    .font(.system(size: 7))
                                                Text(dur >= 60
                                                     ? "\(dur / 60)h\(dur % 60 > 0 ? " \(dur % 60)m" : "")"
                                                     : "\(dur)m")
                                                    .font(.system(size: 9, weight: .medium))
                                            }
                                            .foregroundStyle(Color.textTertiary)
                                            .padding(.horizontal, 4).padding(.vertical, 1)
                                            .background(Color.borderGray.opacity(0.3))
                                            .clipShape(.rect(cornerRadius: 3))
                                        }
                                    }

                                    Spacer()

                                    // Expand indicator (non-interactive — whole card taps)
                                    if task.details != nil && !(task.details!.isEmpty) {
                                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundStyle(.textSecondary.opacity(0.6))
                                    }
                                }
                                .padding(.horizontal, 10).padding(.vertical, 7)
                                .contentShape(Rectangle())   // make whole row hittable
                                .onTapGesture {
                                    if task.details != nil && !(task.details!.isEmpty) {
                                        withAnimation(.easeInOut(duration: 0.18)) {
                                            expandedTaskId = isExpanded ? nil : task.id
                                        }
                                    }
                                }

                                // Expanded detail
                                if isExpanded {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Divider().padding(.horizontal, 10)
                                        if let d = task.details, !d.isEmpty {
                                            Text(d)
                                                .font(.system(size: 11))
                                                .foregroundStyle(.textSecondary)
                                                .lineLimit(3)
                                                .padding(.horizontal, 10)
                                        }
                                        if let link = task.link, !link.isEmpty, let url = URL(string: link) {
                                            Link(destination: url) {
                                                HStack(spacing: 4) {
                                                    Image(systemName: "arrow.up.right.square")
                                                    Text("Open source")
                                                }
                                                .font(.system(size: 10, weight: .medium))
                                                .foregroundStyle(.googleBlue)
                                            }
                                            .padding(.horizontal, 10).padding(.bottom, 8)
                                        } else {
                                            Spacer().frame(height: 4)
                                        }
                                    }
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                            .background(
                                RoundedRectangle(cornerRadius: 7)
                                    .fill(isSelected ? Color.googleBlue.opacity(0.05) : Color.secondarySurface)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 7)
                                            .stroke(isSelected ? Color.googleBlue.opacity(0.25) : Color.clear, lineWidth: 1.5)
                                    )
                            )
                            // Drag this task onto the calendar to schedule it
                            .onDrag {
                                draggingTaskId = task.id
                                return NSItemProvider(object: task.id as NSString)
                            }
                        }

                        if todayTasks.isEmpty {
                            emptyState(icon: "checkmark.circle", message: "No tasks marked for Today.")
                        }
                    }
                    .padding(12)
                }
                .background(Color.surfaceBackground)
            }
            // ── Drop-back-to-inbox zone ─────────────────────────────────────
            // Dragging a calendar event block back onto this column unschedules it.
            .overlay(alignment: .bottom) {
                if draggingTaskId != nil || isUnscheduleTargeted {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.uturn.left")
                            .font(.system(size: 11, weight: .semibold))
                        Text("Drop here to remove from schedule")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(isUnscheduleTargeted ? .white : Color.textSecondary)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(isUnscheduleTargeted ? Color.staleAmber : Color.secondarySurface)
                    .clipShape(.rect(cornerRadius: 0))
                    .animation(.easeInOut(duration: 0.15), value: isUnscheduleTargeted)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .onDrop(of: ["public.plain-text"], isTargeted: $isUnscheduleTargeted) { providers in
                providers.first?.loadObject(ofClass: NSString.self) { item, _ in
                    if let taskId = item as? String {
                        DispatchQueue.main.async {
                            tasksManager.unscheduleTask(id: taskId)
                            draggingTaskId = nil
                        }
                    }
                }
                return true
            }
            .frame(width: 340)

            // ── Divider ────────────────────────────────────────
            Divider()

            // ── Right: Calendar Sidebar (60%) ─────────────────
            VStack(alignment: .leading, spacing: 0) {
                // Sidebar header
                VStack(alignment: .leading, spacing: 2) {
                    Text("Today")
                        .font(.system(size: 15, weight: .bold)).foregroundStyle(.textPrimary)
                    let freeHours = max(0, 10 - busyMinutes / 60)
                    Text("\(busyMinutes / 60)h \(busyMinutes % 60)m busy · \(freeHours)h free")
                        .font(.system(size: 11)).foregroundStyle(.textSecondary)
                }
                .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 12)

                Divider()

                // Time grid
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(7...20, id: \.self) { hour in
                            calendarHourRow(hour: hour)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .background(Color.surfaceBackground)

                // Free time summary
                Divider()
                HStack(spacing: 6) {
                    Image(systemName: "clock").font(.system(size: 11)).foregroundStyle(.textSecondary)
                    Text(busyMinutes == 0 ? "Fully available today" : "\(busyMinutes / 60)h \(busyMinutes % 60)m committed")
                        .font(.system(size: 11)).foregroundStyle(.textSecondary)
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
            }
            .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func calendarHourRow(hour: Int) -> some View {
        CalendarHourRow(
            hour: hour,
            events: todayEvents.filter { $0.startHour == hour },
            onDrop: { taskId in
                tasksManager.scheduleTask(id: taskId, hour: hour, minute: 0)
                promotedTaskIds.insert(taskId)
                draggingTaskId = nil
            }
        )
    }



    // MARK: - Reusable

    @ViewBuilder
    private func stepHeader(number: String, title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text(number)
                    .font(.system(size: 11, weight: .bold)).foregroundStyle(.googleBlue)
                    .frame(width: 20, height: 20)
                    .background(Color.googleBlue.opacity(0.1)).clipShape(Circle())
                Text(title).font(.system(size: 15, weight: .bold)).foregroundStyle(.textPrimary)
            }
            Text(subtitle).font(.system(size: 12)).foregroundStyle(.textSecondary).padding(.leading, 28)
        }
    }

    @ViewBuilder
    private func actionPill(_ label: String, tag: String, selected: String,
                             color: Color, action: @escaping () -> Void) -> some View {
        let isSelected = selected == tag
        Button(action: action) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(isSelected ? .white : .textSecondary)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(isSelected ? color : Color.borderGray.opacity(0.4))
                .clipShape(.rect(cornerRadius: 6))
        }
        .buttonStyle(.plain)
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

    private func actionBorderColor(_ action: String) -> Color {
        switch action {
        case "today":  return Color.successGreen.opacity(0.4)
        case "defer":  return Color.staleAmber.opacity(0.4)
        case "ignore": return Color.manualGray.opacity(0.4)
        default:       return Color.clear
        }
    }

    @ViewBuilder
    private func statPill(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 10)).foregroundStyle(color)
            Text(label).font(.system(size: 11, weight: .medium)).foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }
}

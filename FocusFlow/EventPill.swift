import SwiftUI
import UniformTypeIdentifiers

struct EventPill: View {
    let event: CalendarEvent
    let onTap: () -> Void
    @Environment(TasksManager.self) var tasksManager: TasksManager

    private var isScheduledTask: Bool { event.taskId != nil && !event.taskId!.isEmpty }

    // Live completion status from task model
    private var isCompleted: Bool {
        if let taskId = event.taskId,
           let task = tasksManager.tasks.first(where: { $0.id == taskId }) {
            return task.status == "completed"
        }
        return event.isCompleted
    }

    // Is this event in the past?
    private var isPast: Bool {
        let now = Date()
        let cal = Calendar.current
        let endMinutes = event.dayOffset * 1440 + event.endHour * 60 + event.endMinute
        let todayMinutes = cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)
        // For today (dayOffset 0), check actual minutes; past days are always past
        if event.dayOffset < 0 { return true }
        if event.dayOffset > 0 { return false }
        return todayMinutes >= endMinutes
    }

    // Completed tasks in the past cannot be moved
    private var isDraggable: Bool { isScheduledTask && !(isCompleted && isPast) }

    // Strip prefixes for display
    private var displayTitle: String {
        event.title
            .replacingOccurrences(of: "[FocusFlow] ", with: "")
            .replacingOccurrences(of: "✅ ", with: "")
    }

    private var timeLabel: String {
        String(format: "%d:%02d", event.startHour, event.startMinute)
    }

    // ── RSVP + completion color ───────────────────────────────────────────
    private var pillBackground: Color {
        if isCompleted          { return Color(hex: "#2E7D32") }  // solid green
        if isScheduledTask      { return .googleBlue }
        switch event.rsvpStatus {
        case .maybe:   return Color(hex: "#FF9800")
        case .declined: return Color(hex: "#9E9E9E")
        default:       return Color(hex: "#5C6BC0")
        }
    }

    private var pillOpacity: Double {
        if isCompleted { return 0.9 }
        switch event.rsvpStatus {
        case .maybe:    return 0.45
        case .declined: return 0.25
        default:        return 1.0
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Background
            pillBackground.opacity(pillOpacity)
            if !isCompleted && isScheduledTask && event.rsvpStatus == .unknown {
                LinearGradient(
                    colors: [.white.opacity(0.12), .clear],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            }

            VStack(alignment: .leading, spacing: 0) {
                // Top row: time + title + complete checkbox
                HStack(spacing: 4) {
                    // ── Inline complete button ───────────────────────────
                    if isScheduledTask, let taskId = event.taskId {
                        Button {
                            if isCompleted {
                                tasksManager.uncompleteTask(id: taskId)
                            } else {
                                tasksManager.completeTask(id: taskId)
                            }
                        } label: {
                            Image(systemName: isCompleted
                                  ? "checkmark.circle.fill"
                                  : "circle")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(isCompleted
                                                 ? Color.white
                                                 : Color.white.opacity(0.7))
                        }
                        .buttonStyle(.plain)
                        .help(isCompleted ? "Mark as not complete" : "Mark as complete")
                    }

                    Text(timeLabel)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.75))
                    Text("·")
                        .foregroundStyle(.white.opacity(0.4))
                    Text(displayTitle)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white)
                        .strikethrough(isCompleted, color: .white.opacity(0.7))
                        .lineLimit(1)

                    Spacer(minLength: 0)

                    // Past/completed lock indicator
                    if isCompleted && isPast {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 5)

                // RSVP badge row
                if event.rsvpStatus == .maybe || event.rsvpStatus == .declined {
                    HStack {
                        rsvpBadge
                        Spacer()
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 2)
                }

                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        // RSVP border
        .overlay(pillBorder)
        .clipShape(.rect(cornerRadius: 6))
        .onTapGesture { onTap() }
        .contextMenu { contextMenuItems }
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("\(event.title) — tap to view details")
        .onDrag(if: isDraggable, taskId: event.taskId ?? "", tasksManager: tasksManager)
        .onDrop(of: [.plainText, .text], isTargeted: .none) { providers in
            guard let provider = providers.first else { return false }
            if provider.canLoadObject(ofClass: NSString.self) {
                provider.loadObject(ofClass: NSString.self) { item, _ in
                    guard let taskId = item as? String, !taskId.isEmpty else { return }
                    Task { @MainActor in
                        FFLogger.log("[Drop] EventPill accepted drop of taskId: \(taskId) at hour:\(event.startHour) minute:\(event.startMinute)")
                        tasksManager.scheduleTask(id: taskId, hour: event.startHour,
                                                  minute: event.startMinute, dayOffset: event.dayOffset)
                    }
                }
                return true
            }
            return false
        }
    }

    // ── Borders ───────────────────────────────────────────────────────────
    @ViewBuilder private var pillBorder: some View {
        switch event.rsvpStatus {
        case .maybe:
            RoundedRectangle(cornerRadius: 6)
                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                .foregroundStyle(Color(hex: "#FF9800").opacity(0.6))
        case .declined:
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.borderGray.opacity(0.5), lineWidth: 1)
        default:
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.white.opacity(isScheduledTask ? 0.15 : 0.1), lineWidth: 0.5)
        }
    }

    // ── RSVP badge ────────────────────────────────────────────────────────
    @ViewBuilder private var rsvpBadge: some View {
        switch event.rsvpStatus {
        case .maybe:
            Text("MAYBE")
                .font(.system(size: 7, weight: .bold))
                .foregroundStyle(Color(hex: "#FF9800"))
                .padding(.horizontal, 4).padding(.vertical, 1)
                .background(Color(hex: "#FF9800").opacity(0.2))
                .clipShape(.rect(cornerRadius: 2))
        case .declined:
            Text("DECLINED")
                .font(.system(size: 7, weight: .bold))
                .foregroundStyle(.textSecondary)
                .padding(.horizontal, 4).padding(.vertical, 1)
                .background(Color.borderGray.opacity(0.3))
                .clipShape(.rect(cornerRadius: 2))
        default:
            EmptyView()
        }
    }

    // ── Context menu ──────────────────────────────────────────────────────
    @ViewBuilder private var contextMenuItems: some View {
        if isScheduledTask, let taskId = event.taskId {
            if !isCompleted {
                Button {
                    tasksManager.completeTask(id: taskId)
                } label: {
                    Label("Mark as Complete", systemImage: "checkmark.circle")
                }
            } else {
                Button {
                    tasksManager.uncompleteTask(id: taskId)
                } label: {
                    Label("Mark as Not Complete", systemImage: "circle")
                }
            }
            Divider()
            if !isCompleted || !isPast {
                Button {
                    tasksManager.unscheduleTask(id: taskId)
                } label: {
                    Label("Move back to Inbox", systemImage: "tray.and.arrow.down")
                }
            }
        }
    }
}

// MARK: - Conditional onDrag helper
extension View {
    @ViewBuilder
    func onDrag(if condition: Bool, taskId: String, tasksManager: TasksManager) -> some View {
        if condition {
            self.onDrag({
                FFLogger.log("[Drag] EventPill drag started for taskId: \(taskId)")
                tasksManager.isDragging = true
                tasksManager.draggedTaskId = taskId
                return NSItemProvider(object: taskId as NSString)
            }, preview: {
                HStack(spacing: 6) {
                    Image(systemName: "timer")
                    Text(taskId)
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.vertical, 5).padding(.horizontal, 10)
                .background(Color.googleBlue)
                .clipShape(.rect(cornerRadius: 6))
                .frame(maxWidth: 180)
            })
        } else {
            self
        }
    }
}

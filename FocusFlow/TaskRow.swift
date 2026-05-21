import SwiftUI

// MARK: - Task Row  (Medium rows, expandable — Linear style)
struct TaskRow: View {
    let task: TaskItem
    /// Called when the user taps the note icon. Nil-safe — existing callsites unchanged.
    var onOpenEditor: ((TaskItem) -> Void)? = nil

    @Environment(TasksManager.self) var tasksManager
    @State private var isExpanded = false
    @State private var isHovered  = false
    @State private var showingEditForm  = false
    @State private var showingFocusMode = false

    private var isCompleted: Bool { task.status == "completed" }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Collapsed row ───────────────────────────────────────────
            HStack(spacing: 10) {

                // Source accent bar
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(task.source.color)
                    .frame(width: 3, height: 36)

                // Checkbox
                Button {
                    if isCompleted { tasksManager.uncompleteTask(id: task.id) }
                    else           { tasksManager.completeTask(id: task.id) }
                } label: {
                    ZStack {
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(isCompleted ? Color.successGreen : Color.borderGray, lineWidth: 1.5)
                            .frame(width: 17, height: 17)
                        if isCompleted {
                            Image(systemName: "checkmark")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.successGreen)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isCompleted ? "Mark Uncompleted" : "Mark Completed")

                // Title + subtitle
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(task.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(isCompleted ? .textSecondary : .textPrimary)
                            .strikethrough(isCompleted)
                            .lineLimit(1)

                        if task.isStale {
                            Image(systemName: "clock.badge.exclamationmark")
                                .font(.system(size: 10))
                                .foregroundColor(.staleAmber)
                        }

                        // Note badge — visible when a Drive note file exists
                        if task.hasNote {
                            Image(systemName: "doc.text.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(Color.googleBlue.opacity(0.7))
                                .accessibilityLabel("Has note")
                        }

                        // Link icon(s) — shown inline after the title
                        if let rawLink = task.link, !rawLink.isEmpty {
                            let urls = rawLink
                                .components(separatedBy: "\n")
                                .filter { !$0.isEmpty }
                                .compactMap { URL(string: $0) }
                            ForEach(urls.indices, id: \.self) { idx in
                                Link(destination: urls[idx]) {
                                    Image(systemName: "arrow.up.right.circle")
                                        .font(.system(size: 11))
                                        .foregroundColor(.googleBlue.opacity(0.8))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    HStack(spacing: 6) {
                        // Source icon only (no label text, saves space)
                        Image(systemName: task.source.iconName)
                            .font(.system(size: 11))
                            .foregroundStyle(task.source.color.opacity(0.9))

                        if let duration = task.duration {
                            Text("·")
                                .foregroundColor(.textTertiary)
                            Text("\(duration)m")
                                .font(.system(size: 10))
                                .foregroundColor(.textSecondary)
                        }

                        if let priority = task.priority, !priority.isEmpty {
                            Text("·")
                                .foregroundColor(.textTertiary)
                            priorityBadge(priority)
                        }

                        if let date = task.date, !date.isEmpty {
                            Text("·")
                                .foregroundStyle(.textTertiary)
                            Text(TasksManager.formatDateForDisplay(date) ?? date)
                                .font(.system(size: 10))
                                .foregroundStyle(task.isStale ? .staleAmber : .textSecondary)
                        }
                    }
                }

                Spacer()

                // Hover actions
                if isHovered {
                    HStack(spacing: 4) {
                        // Open in editor
                        Button {
                            onOpenEditor?(task)
                        } label: {
                            Image(systemName: "doc.text")
                                .font(.system(size: 11))
                                .foregroundColor(.googleBlue.opacity(0.8))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Open Note")
                        .help("Open note in editor panel")

                        Button { showingEditForm = true } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: 11))
                                .foregroundColor(.textSecondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Edit Task")

                        Button { tasksManager.deleteTask(id: task.id) } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 11))
                                .foregroundColor(.textSecondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Delete Task")
                    }
                    .padding(.trailing, 4)
                }

                // Expand chevron
                if task.details != nil && !(task.details?.isEmpty ?? true) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                        .foregroundColor(.textSecondary)
                        .animation(.easeInOut(duration: 0.15), value: isExpanded)
                }
            }
            .padding(.vertical, 9)
            .padding(.horizontal, 12)
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            }
            .accessibilityLabel(isExpanded ? "Collapse Details" : "Expand Details")

            // ── Expanded detail section ──────────────────────────────────
            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    Divider()
                        .padding(.leading, 26)

                    if let details = task.details, !details.isEmpty {
                        Text(details)
                            .font(.system(size: 12))
                            .foregroundColor(.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.leading, 26)
                    }

                    // Child tasks — named parameters to avoid $0 shadowing bug.
                    // 'child' is the TaskItem; 'ev' is the CalendarEvent.
                    // A subtask is shown here only when it is NOT currently scheduled.
                    let childTasks = tasksManager.tasks.filter { child in
                        child.parentTaskId == task.id &&
                        !tasksManager.calendarEvents.contains(where: { ev in ev.taskId == child.id })
                    }
                    if !childTasks.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(childTasks) { child in
                                TaskRow(task: child)
                                    .padding(.leading, 14)
                            }
                        }
                    }

                    // Subtask Suggestions Panel — always shown so user can
                    // type context before first generation.
                    SubtaskSuggestionsPanel(task: task)
                        .padding(.leading, 12)

                    // Action buttons
                    HStack(spacing: 8) {
                        actionButton(label: "Start Focus", icon: "timer", color: .successGreen) {
                            showingFocusMode = true
                        }
                    }
                    .padding(.leading, 26)
                    .padding(.bottom, 10)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(
            rowBackground
        )
        .overlay(
            Rectangle()
                .fill(Color.borderGray.opacity(0.5))
                .frame(height: 1),
            alignment: .bottom
        )
        .draggable(task.id) {
            HStack(spacing: 6) {
                Image(systemName: "timer")
                Text(task.title)
                    .lineLimit(1)
            }
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.vertical, 5).padding(.horizontal, 10)
            .background(Color.googleBlue)
            .clipShape(.rect(cornerRadius: 6))
            .frame(maxWidth: 200)
        }
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.15)) { isHovered = hovering }
        }
        .sheet(isPresented: $showingEditForm) {
            TaskFormView(isPresented: $showingEditForm, taskToEdit: task)
        }
        .sheet(isPresented: $showingFocusMode) {
            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button("Close") { showingFocusMode = false }.padding()
                }
                FocusModeView(
                    taskTitle: task.title,
                    taskId: task.id,
                    taskDetails: task.details,
                    taskDuration: tasksManager.defaultDuration,
                    isPresented: $showingFocusMode
                )
            }
            .frame(width: 600, height: 500)
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private var rowBackground: some View {
        if isExpanded {
            Color.selectedRowBg
        } else if isHovered {
            Color.secondarySurface
        } else if task.isStale {
            Color.staleAmber.opacity(0.04)
        } else {
            Color.surfaceBackground
        }
    }

    @ViewBuilder
    private func priorityBadge(_ priority: String) -> some View {
        let color: Color = {
            switch priority.lowercased() {
            case "high":   return .priorityHigh
            case "medium": return .priorityMedium
            case "low":    return .priorityLow
            default:       return .manualGray
            }
        }()
        Text(priority.uppercased())
            .font(.system(size: 8, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(.rect(cornerRadius: 3))
    }

    @ViewBuilder
    private func actionButton(label: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(label, systemImage: icon)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white)
                .padding(.vertical, 5)
                .padding(.horizontal, 10)
                .background(color)
                .clipShape(.rect(cornerRadius: 5))
        }
        .buttonStyle(.plain)
    }
}



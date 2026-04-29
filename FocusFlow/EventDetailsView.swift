import SwiftUI

/// Full in-place editor for a scheduled FocusFlow task.
/// Opens when the user clicks any EventPill. All fields are immediately editable.
/// External (non-FocusFlow) events get a read-only display.
struct EventDetailsView: View {
    let event: CalendarEvent
    @Environment(\.dismiss) var dismiss
    @Environment(TasksManager.self) var tasksManager

    private var task: TaskItem? {
        guard let id = event.taskId else { return nil }
        return tasksManager.tasks.first { $0.id == id }
    }

    private var isFFTask: Bool { event.taskId != nil }

    // ── Editable state ────────────────────────────────────────────────────
    @State private var title       = ""
    @State private var details     = ""
    @State private var urls        = [""]
    @State private var durationMin = ""
    @State private var isDirty     = false

    private var isCompleted: Bool {
        task?.status == "completed" || event.isCompleted
    }

    private var timeLabel: String {
        String(format: "%d:%02d – %d:%02d",
               event.startHour, event.startMinute,
               event.endHour, event.endMinute)
    }

    private let durationPresets = [15, 30, 45, 60, 90, 120]

    var body: some View {
        VStack(spacing: 0) {
            // ── Header ─────────────────────────────────────────────────────
            HStack(spacing: 10) {
                // Complete toggle
                if isFFTask, let taskId = event.taskId {
                    Button {
                        if isCompleted { tasksManager.uncompleteTask(id: taskId) }
                        else           { tasksManager.completeTask(id: taskId)   }
                        dismiss()
                    } label: {
                        Image(systemName: isCompleted
                              ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 20))
                            .foregroundStyle(isCompleted ? Color.successGreen : Color.textSecondary)
                    }
                    .buttonStyle(.plain)
                    .help(isCompleted ? "Mark as not complete" : "Mark as complete")
                }

                VStack(alignment: .leading, spacing: 2) {
                    if isFFTask {
                        // Editable title
                        TextField("Task title", text: $title)
                            .font(.system(size: 16, weight: .semibold))
                            .textFieldStyle(.plain)
                            .foregroundStyle(isCompleted ? Color.textSecondary : Color.textPrimary)
                            .strikethrough(isCompleted)
                            .onChange(of: title) { _, _ in isDirty = true }
                            .onSubmit { if isDirty { save(); dismiss() } }
                    } else {
                        Text(event.title
                                .replacingOccurrences(of: "[FocusFlow] ", with: ""))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.textPrimary)
                    }
                    Text(timeLabel)
                        .font(.system(size: 11))
                        .foregroundStyle(.textSecondary)
                }

                Spacer()

                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.textSecondary)
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.escape, modifiers: [])
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if isFFTask {
                editableBody
            } else {
                readOnlyBody
            }
        }
        .frame(width: 460)
        .background(Color.surfaceBackground)
        .clipShape(.rect(cornerRadius: 12))
        .onAppear { populate() }
    }

    // ── Editable body (FocusFlow tasks) ───────────────────────────────────
    private var editableBody: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // Details
                    formField("DETAILS") {
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $details)
                                .font(.system(size: 13))
                                .frame(minHeight: 80)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                                .onChange(of: details) { _, _ in isDirty = true }
                            if details.isEmpty {
                                Text("Context, notes, or description…")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.textSecondary)
                                    .padding(.top, 16).padding(.leading, 12)
                                    .allowsHitTesting(false)
                            }
                        }
                        .background(Color.secondarySurface)
                        .clipShape(.rect(cornerRadius: 7))
                    }

                    // Duration — compact inline row + preset chips
                    formField("DURATION") {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "clock")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.textSecondary)
                                TextField("30", text: $durationMin)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 13))
                                    .frame(width: 44)
                                    .onChange(of: durationMin) { _, _ in isDirty = true }
                                Text("min")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.textSecondary)
                                Spacer()
                            }
                            .padding(.horizontal, 10).padding(.vertical, 7)
                            .background(Color.secondarySurface)
                            .clipShape(.rect(cornerRadius: 7))

                            // Quick-select chips
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(durationPresets, id: \.self) { mins in
                                        Button {
                                            durationMin = "\(mins)"
                                            isDirty = true
                                        } label: {
                                            Text("\(mins)m")
                                                .font(.system(size: 11, weight: .medium))
                                                .foregroundStyle(
                                                    durationMin == "\(mins)" ? Color.white : Color.textPrimary
                                                )
                                                .padding(.horizontal, 10).padding(.vertical, 5)
                                                .background(
                                                    durationMin == "\(mins)"
                                                    ? Color.googleBlue : Color.secondarySurface
                                                )
                                                .clipShape(.rect(cornerRadius: 5))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }

                    // Links — with duplicate URL guard
                    formField("LINKS") {
                        VStack(spacing: 8) {
                            ForEach(urls.indices, id: \.self) { idx in
                                HStack(spacing: 8) {
                                    Image(systemName: "link")
                                        .font(.system(size: 11))
                                        .foregroundStyle(.textSecondary)
                                    TextField("https://", text: $urls[idx])
                                        .textFieldStyle(.plain)
                                        .font(.system(size: 13))
                                        .onChange(of: urls[idx]) { _, _ in isDirty = true }
                                    if let url = URL(string: urls[idx]),
                                       url.scheme?.hasPrefix("http") == true {
                                        Link(destination: url) {
                                            Image(systemName: "arrow.up.right.square")
                                                .font(.system(size: 11))
                                                .foregroundStyle(.googleBlue)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    if urls.count > 1 {
                                        Button { urls.remove(at: idx); isDirty = true } label: {
                                            Image(systemName: "minus.circle.fill")
                                                .foregroundStyle(.gmailRed)
                                                .font(.system(size: 13))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 10).padding(.vertical, 8)
                                .background(Color.secondarySurface)
                                .clipShape(.rect(cornerRadius: 7))
                            }
                            Button {
                                urls.append("")
                                isDirty = true
                            } label: {
                                Label("Add link", systemImage: "plus.circle")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.googleBlue)
                            }
                            .buttonStyle(.plain)
                            // Disable if last URL is empty or already a duplicate
                            .disabled({
                                guard let last = urls.last else { return false }
                                let trimmed = last.trimmingCharacters(in: .whitespaces)
                                if trimmed.isEmpty { return true }
                                return urls.dropLast().contains(trimmed)
                            }())
                        }
                    }

                    // Danger zone — unschedule
                    if let taskId = event.taskId {
                        Button {
                            tasksManager.unscheduleTask(id: taskId)
                            dismiss()
                        } label: {
                            Label("Remove from Schedule", systemImage: "tray.and.arrow.down")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.staleAmber)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }

            Divider()

            // Footer
            HStack {
                Button("Cancel") { dismiss() }
                    .keyboardShortcut(.escape, modifiers: [])
                Spacer()
                Button("Save Changes") { save() }
                    .keyboardShortcut(.return, modifiers: [])
                    .buttonStyle(.borderedProminent)
                    .disabled(!isDirty || title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
    }

    // ── Read-only body (external calendar events) ─────────────────────────
    private var readOnlyBody: some View {
        VStack(alignment: .leading, spacing: 12) {
            if event.rsvpStatus == .maybe || event.rsvpStatus == .declined {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle.badge.questionmark")
                        .foregroundStyle(.staleAmber)
                    Text(event.rsvpStatus == .maybe ? "You marked this as maybe" : "You declined this event")
                        .font(.system(size: 12))
                        .foregroundStyle(.staleAmber)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            Text("This is an external calendar event and cannot be edited here.")
                .font(.system(size: 12))
                .foregroundStyle(.textSecondary)
                .padding(.horizontal, 20)
                .padding(.top, 8)
            Spacer()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    @ViewBuilder
    private func formField<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.textSecondary)
                .tracking(0.8)
            content()
        }
    }

    private func populate() {
        guard let t = task else { return }
        title      = t.title
        details    = t.details ?? ""
        durationMin = t.duration != nil ? "\(t.duration!)" : {
            let mins = (event.endHour * 60 + event.endMinute) - (event.startHour * 60 + event.startMinute)
            return "\(mins)"
        }()
        if let link = t.link, !link.isEmpty {
            urls = link.components(separatedBy: "\n").filter { !$0.isEmpty }
            if urls.isEmpty { urls = [""] }
        }
        isDirty = false
    }

    private func save() {
        guard let t = task else { return }
        let newDuration = Int(durationMin)
        let combinedLink = urls.filter { !$0.isEmpty }.joined(separator: "\n")
        tasksManager.updateTask(
            id: t.id,
            title: title.trimmingCharacters(in: .whitespaces),
            details: details.isEmpty ? nil : details,
            link: combinedLink.isEmpty ? nil : combinedLink,
            duration: newDuration
        )
        // Reschedule to apply new duration to the EK event
        if let dur = newDuration, dur > 0 {
            tasksManager.scheduleTask(
                id: t.id, hour: event.startHour, minute: event.startMinute,
                dayOffset: event.dayOffset
            )
        }
        dismiss()
    }
}

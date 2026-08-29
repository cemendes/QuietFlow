import SwiftUI

struct TaskFormView: View {
    @Environment(TasksManager.self) var tasksManager: TasksManager
    @Binding var isPresented: Bool

    var taskToEdit: TaskItem? = nil

    @State private var title: String = ""
    @State private var details: String = ""
    @State private var urls: [String] = [""]   // multi-URL support
    @State private var durationInput: String = "30"  // default 30 min
    @State private var priority: String = "low"      // default Low
    @State private var showDurationSuggestions = false

    private let priorities = [("low", "Low"), ("medium", "Medium"), ("high", "High")]

    private let durationPresets: [(label: String, minutes: Int)] = [
        ("15 min",  15),
        ("30 min",  30),
        ("45 min",  45),
        ("60 min",  60),
        ("90 min",  90),
        ("120 min", 120),
    ]

    private var filteredPresets: [(label: String, minutes: Int)] {
        guard !durationInput.isEmpty else { return durationPresets }
        return durationPresets.filter { $0.label.hasPrefix(durationInput)
            || "\($0.minutes)".hasPrefix(durationInput) }
    }

    private var durationInt: Int? { Int(durationInput) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Header ────────────────────────────────────────────────────
            HStack {
                Text(taskToEdit == nil ? "New Task" : "Edit Task")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.textPrimary)
                Spacer()
                Button { isPresented = false } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.textSecondary)
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.escape, modifiers: [])
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)
            .padding(.bottom, 16)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // ── Title ─────────────────────────────────────────────
                    formField(label: "TITLE") {
                        TextField("What needs to be done?", text: $title)
                            .textFieldStyle(.plain)
                            .font(.system(size: 14))
                            .padding(10)
                            .background(Color.secondarySurface)
                            .clipShape(.rect(cornerRadius: 7))
                    }

                    // ── Details ───────────────────────────────────────────
                    formField(label: "DETAILS") {
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $details)
                                .font(.system(size: 13))
                                .frame(minHeight: 90)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                            if details.isEmpty {
                                Text("Context, notes, or description…")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.textSecondary)
                                    .padding(.top, 16)
                                    .padding(.leading, 12)
                                    .allowsHitTesting(false)
                            }
                        }
                        .background(Color.secondarySurface)
                        .clipShape(.rect(cornerRadius: 7))
                    }

                    // ── URLs ──────────────────────────────────────────────
                    formField(label: "LINKS") {
                        VStack(spacing: 8) {
                            ForEach(urls.indices, id: \.self) { idx in
                                HStack(spacing: 8) {
                                    Image(systemName: "link")
                                        .font(.system(size: 11))
                                        .foregroundStyle(.textSecondary)
                                    TextField("https://", text: $urls[idx])
                                        .textFieldStyle(.plain)
                                        .font(.system(size: 13))
                                        .autocorrectionDisabled()
                                    // Open button if URL is valid
                                    if let url = URL(string: urls[idx]),
                                       url.scheme?.hasPrefix("http") == true {
                                        Link(destination: url) {
                                            Image(systemName: "arrow.up.right.square")
                                                .font(.system(size: 11))
                                                .foregroundStyle(.googleBlue)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    // Remove button (only if more than one row)
                                    if urls.count > 1 {
                                        Button {
                                            urls.remove(at: idx)
                                        } label: {
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
                            // Add URL button — disabled if last field is empty or duplicate
                            Button {
                                urls.append("")
                            } label: {
                                Label("Add another link", systemImage: "plus.circle")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.googleBlue)
                            }
                            .buttonStyle(.plain)
                            .disabled({
                                guard let last = urls.last else { return false }
                                let trimmed = last.trimmingCharacters(in: .whitespaces)
                                if trimmed.isEmpty { return true }
                                return urls.dropLast().contains(trimmed)
                            }())
                        }
                    }

                    // ── Priority ──────────────────────────────────────────
                    formField(label: "PRIORITY") {
                        HStack(spacing: 8) {
                            ForEach(priorities, id: \.0) { (value, label) in
                                let isSelected = priority == value
                                let color: Color = value == "high" ? .priorityHigh
                                    : value == "medium" ? .priorityMedium : .priorityLow
                                Button { priority = value } label: {
                                    Text(label)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(isSelected ? Color.white : color)
                                        .padding(.horizontal, 14).padding(.vertical, 6)
                                        .background(isSelected ? color : color.opacity(0.1))
                                        .clipShape(.rect(cornerRadius: 6))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // ── Duration ──────────────────────────────────────────
                    formField(label: "DURATION") {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(spacing: 8) {
                                Image(systemName: "clock")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.textSecondary)
                                TextField("30", text: $durationInput)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 13))
                                    .frame(width: 60)
                                    .onChange(of: durationInput) { _, _ in
                                        showDurationSuggestions = !durationInput.isEmpty
                                    }
                                Text("min")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.textSecondary)
                                Spacer()
                            }
                            .padding(.horizontal, 10).padding(.vertical, 8)
                            .background(Color.secondarySurface)
                            .clipShape(.rect(cornerRadius: 7))

                            // Presets
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(durationPresets, id: \.minutes) { preset in
                                        Button {
                                            durationInput = "\(preset.minutes)"
                                            showDurationSuggestions = false
                                        } label: {
                                            Text(preset.label)
                                                .font(.system(size: 11, weight: .medium))
                                                .foregroundStyle(
                                                    durationInput == "\(preset.minutes)"
                                                    ? Color.white : .textPrimary
                                                )
                                                .padding(.horizontal, 10).padding(.vertical, 5)
                                                .background(
                                                    durationInput == "\(preset.minutes)"
                                                    ? Color.googleBlue : Color.secondarySurface
                                                )
                                                .clipShape(.rect(cornerRadius: 5))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .padding(.top, 8)
                        }
                    }
                }
                .padding(20)
            }

            Divider()

            // ── Footer ────────────────────────────────────────────────────
            HStack {
                Button("Cancel") { isPresented = false }
                Spacer()
                Button(taskToEdit == nil ? "Create Task" : "Save Changes") {
                    saveTask()
                }
                .keyboardShortcut(.return, modifiers: [])
                .buttonStyle(.borderedProminent)
                .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .frame(width: 460)
        .background(Color.surfaceBackground)
        .clipShape(.rect(cornerRadius: 12))
        .onExitCommand { isPresented = false }
        // NSEvent monitor catches Escape/Return even when a TextField is focused.
        .background(
            KeyboardResponder(
                onEscape: { isPresented = false },
                onReturn: {
                    if !title.trimmingCharacters(in: .whitespaces).isEmpty {
                        saveTask()
                    }
                }
            )
        )
        .onAppear { populateIfEditing() }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    @ViewBuilder
    private func formField<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.textSecondary)
                .tracking(0.8)
            content()
        }
    }

    private func populateIfEditing() {
        guard let task = taskToEdit else { return }
        title         = task.title
        details       = task.details ?? ""
        durationInput = task.duration.map { "\($0)" } ?? "30"
        priority      = task.priority?.lowercased() ?? "low"
        // Split link field into urls array
        if let link = task.link, !link.isEmpty {
            urls = link.components(separatedBy: "\n").filter { !$0.isEmpty }
            if urls.isEmpty { urls = [""] }
        } else {
            urls = [""]
        }
    }

    private func saveTask() {
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        guard !trimmedTitle.isEmpty else { return }
        // Deduplicate and clean URLs on save (more reliable than disabled-button state)
        var seen = Set<String>()
        let cleanedUrls = urls
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty && seen.insert($0).inserted }
        let combinedLink = cleanedUrls.joined(separator: "\n")
        let dur = durationInt

        if let task = taskToEdit {
            tasksManager.updateTask(
                id: task.id,
                title: trimmedTitle,
                details: details.isEmpty ? nil : details,
                link: combinedLink.isEmpty ? nil : combinedLink,
                duration: dur,
                priority: priority
            )
        } else {
            tasksManager.createTask(
                title: trimmedTitle,
                details: details.isEmpty ? nil : details,
                link: combinedLink.isEmpty ? nil : combinedLink,
                duration: dur,
                priority: priority
            )
        }
        isPresented = false
    }
}

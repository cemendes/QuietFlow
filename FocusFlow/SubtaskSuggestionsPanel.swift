import SwiftUI

// MARK: - Subtask Suggestions Panel
/// Rendered inside the expanded TaskRow. Shows the AI-generated suggestions
/// as editable cards. The user can edit title/details/duration, delete individual
/// suggestions, add a blank one manually, regenerate all, or commit to CSV.
struct SubtaskSuggestionsPanel: View {
    let task: TaskItem
    @Environment(TasksManager.self) var tasksManager

    // We read directly from tasksManager's observable dict — no @State copy needed.
    private var suggestions: [SubtaskSuggestion] {
        tasksManager.subtaskSuggestions[task.id] ?? []
    }
    private var isLoading: Bool {
        tasksManager.subtaskLoadingState[task.id] == true
    }

    @State private var regeneratePrompt: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // ── Header ────────────────────────────────────────────────────
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.googleBlue)
                Text("AI Suggestions")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.textPrimary)
                if suggestions.isEmpty && !isLoading {
                    Text("· add context or break down")
                        .font(.system(size: 10))
                        .foregroundStyle(.textSecondary)
                } else {
                    Text("· editable before creating")
                        .font(.system(size: 10))
                        .foregroundStyle(.textSecondary)
                }

                Spacer()

                // Refine/context field — always visible
                TextField(suggestions.isEmpty ? "Add context…" : "Refine…", text: $regeneratePrompt)
                    .textFieldStyle(.plain)
                    .font(.system(size: 11))
                    .foregroundStyle(.textPrimary)
                    .frame(width: 130)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Color.secondarySurface)
                    .clipShape(.rect(cornerRadius: 5))
                    .onSubmit {
                        guard !isLoading else { return }
                        if suggestions.isEmpty {
                            tasksManager.breakdownTask(id: task.id, extraContext: regeneratePrompt)
                        } else {
                            tasksManager.regenerateSuggestions(for: task.id, extraContext: regeneratePrompt)
                        }
                        regeneratePrompt = ""
                    }

                // Break Down (first time) or ↺ (subsequent)
                Button {
                    guard !isLoading else { return }
                    if suggestions.isEmpty {
                        tasksManager.breakdownTask(id: task.id, extraContext: regeneratePrompt)
                    } else {
                        tasksManager.regenerateSuggestions(for: task.id, extraContext: regeneratePrompt)
                    }
                    regeneratePrompt = ""
                } label: {
                    Image(systemName: suggestions.isEmpty ? "scissors" : "arrow.clockwise")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(suggestions.isEmpty ? Color.googleBlue : .textSecondary)
                }
                .buttonStyle(.plain)
                .help(suggestions.isEmpty ? "Break down this task with AI" : "Regenerate suggestions")
                .disabled(isLoading)
            }

            // ── Loading state ─────────────────────────────────────────────
            if isLoading {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.7)
                        .frame(width: 16, height: 16)
                    Text("Thinking…")
                        .font(.system(size: 12))
                        .foregroundStyle(.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 8)
            }

            // ── Suggestion cards ──────────────────────────────────────────
            if !suggestions.isEmpty {
                VStack(spacing: 6) {
                    ForEach(Array(suggestions.enumerated()), id: \.element.id) { index, suggestion in
                        SuggestionCard(
                            suggestion: Binding(
                                get: {
                                    if index < (tasksManager.subtaskSuggestions[task.id]?.count ?? 0) {
                                        return tasksManager.subtaskSuggestions[task.id]![index]
                                    }
                                    return suggestion
                                },
                                set: { newValue in
                                    if index < (tasksManager.subtaskSuggestions[task.id]?.count ?? 0) {
                                        tasksManager.subtaskSuggestions[task.id]![index] = newValue
                                    }
                                }
                            ),
                            onDelete: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    tasksManager.removeSuggestion(
                                        id: suggestion.id, from: task.id)
                                }
                            }
                        )
                    }
                }

                // ── Action bar ────────────────────────────────────────────
                HStack(spacing: 8) {
                    // Add blank suggestion manually
                    Button {
                        let blank = SubtaskSuggestion(
                            parentTaskId: task.id,
                            title: "",
                            details: "",
                            duration: 30
                        )
                        withAnimation { tasksManager.addSuggestion(blank, for: task.id) }
                    } label: {
                        Label("Add", systemImage: "plus")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                            .padding(.vertical, 5)
                            .padding(.horizontal, 10)
                            .background(Color.secondarySurface)
                            .clipShape(.rect(cornerRadius: 5))
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    // Commit to CSV
                    Button {
                        tasksManager.createSubTasks(from: suggestions, for: task)
                    } label: {
                        Label("Create \(suggestions.count) Sub-tasks",
                               systemImage: "list.bullet.indent")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.vertical, 6)
                            .padding(.horizontal, 14)
                            .background(Color.googleBlue)
                            .clipShape(.rect(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                    .disabled(suggestions.allSatisfy { $0.title.isEmpty })
                }
            }
        }
        .padding(.horizontal, 26)
        .padding(.vertical, 10)
        .background(Color.googleBlue.opacity(0.04))
        .overlay(
            Rectangle()
                .fill(Color.googleBlue.opacity(0.25))
                .frame(width: 2),
            alignment: .leading
        )
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

// MARK: - Suggestion Card
/// One editable row inside the SubtaskSuggestionsPanel.
struct SuggestionCard: View {
    @Binding var suggestion: SubtaskSuggestion
    let onDelete: () -> Void

    @State private var isExpanded = false

    private let durationOptions: [Int] = [15, 30, 45, 60, 90, 120]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Title row ─────────────────────────────────────────────────
            HStack(spacing: 8) {
                // Drag handle indicator
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 10))
                    .foregroundStyle(.textSecondary.opacity(0.4))

                // Editable title
                TextField("Sub-task title", text: $suggestion.title)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.textPrimary)

                // Duration picker (compact)
                Menu {
                    ForEach(durationOptions, id: \.self) { mins in
                        Button("\(mins)m") { suggestion.duration = mins }
                    }
                } label: {
                    HStack(spacing: 2) {
                        Image(systemName: "clock")
                            .font(.system(size: 9))
                        Text(suggestion.duration.map { "\($0)m" } ?? "–")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(.textSecondary)
                    .padding(.horizontal, 6).padding(.vertical, 3)
                    .background(Color.secondarySurface)
                    .clipShape(.rect(cornerRadius: 4))
                }
                .menuStyle(.borderlessButton)
                .fixedSize()

                // Expand/collapse details
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { isExpanded.toggle() }
                } label: {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 9))
                        .foregroundStyle(.textSecondary)
                }
                .buttonStyle(.plain)
                .help(isExpanded ? "Hide details" : "Edit details")

                // Delete
                Button(action: onDelete) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.gmailRed.opacity(0.7))
                }
                .buttonStyle(.plain)
                .help("Remove this suggestion")
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)

            // ── Details (expanded) ────────────────────────────────────────
            if isExpanded {
                Divider()
                    .padding(.leading, 10)

                ZStack(alignment: .topLeading) {
                    TextEditor(text: $suggestion.details)
                        .font(.system(size: 11))
                        .frame(minHeight: 56)
                        .scrollContentBackground(.hidden)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                    if suggestion.details.isEmpty {
                        Text("Description, links, context…")
                            .font(.system(size: 11))
                            .foregroundStyle(.textSecondary)
                            .padding(.leading, 14)
                            .padding(.top, 12)
                            .allowsHitTesting(false)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color.surfaceBackground)
        .clipShape(.rect(cornerRadius: 7))
        .overlay(
            RoundedRectangle(cornerRadius: 7)
                .stroke(Color.borderGray.opacity(0.5), lineWidth: 0.5)
        )
    }
}

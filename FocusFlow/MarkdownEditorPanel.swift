import SwiftUI
import AppKit

// MARK: - Markdown Editor Panel
/// Phase 2A: 4th panel showing a per-task markdown note editor.
/// Uses NSTextView (fully offline) with monospaced typography.
/// Auto-saves 500ms after the user stops typing.

struct MarkdownEditorPanel: View {

    let task:        TaskItem?
    let projectItem: ProjectItem?
    let onClose:     () -> Void

    @State private var content:      String = ""
    @State private var isSaved:      Bool   = true
    @State private var saveDebounce: Task<Void, Never>? = nil

    private let notes    = NoteManager.shared
    private let projects = ProjectManager()   // local instance just for I/O

    /// A stable key that changes whenever the editing subject changes —
    /// used by onChange to reload content when switching tasks or projects.
    private var editorKey: String {
        if let t = task        { return "task-\(t.id)" }
        if let p = projectItem { return "proj-\(p.id)" }
        return "empty"
    }

    var body: some View {
        VStack(spacing: 0) {
            editorHeader

            Divider()
                .overlay(Color.borderGray.opacity(0.6))

            if task != nil || projectItem != nil {
                MarkdownTextView(
                    text: $content,
                    onTextChange: { newText in
                        isSaved = false
                        scheduleAutosave(key: editorKey, content: newText)
                    }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear         { loadContent() }
                .onChange(of: editorKey) { _, _ in loadContent() }
            } else {
                emptyState
            }
        }
        .background(Color.secondarySurface)
    }

    // MARK: - Header

    private var editorHeader: some View {
        HStack(spacing: 8) {
            Image(systemName: projectItem != nil ? "folder.fill" : "doc.text")
                .font(.system(size: 11))
                .foregroundStyle(projectItem != nil ? projectItem!.color : .textSecondary)

            // Title
            if let proj = projectItem {
                Text(proj.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)

                // Status badge
                Text(proj.status.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(statusColor(proj.status).opacity(0.9))
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(statusColor(proj.status).opacity(0.12))
                    .clipShape(.rect(cornerRadius: 4))
            } else {
                Text(task?.cleanTitle ?? "Notes")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)

                // Project badge for task
                if let proj = task?.resolvedProject {
                    Text(proj.uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Color.projectColor(for: proj).opacity(0.9))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.projectColor(for: proj).opacity(0.12))
                        .clipShape(.rect(cornerRadius: 4))
                }
            }

            Spacer()

            // Save indicator
            if !isSaved {
                Label("Saving…", systemImage: "arrow.triangle.2.circlepath")
                    .font(.system(size: 10))
                    .foregroundStyle(.textTertiary)
                    .transition(.opacity)
            }

            // Close
            Button(action: onClose) {
                Image(systemName: "sidebar.right")
                    .font(.system(size: 12))
                    .foregroundStyle(.textSecondary)
            }
            .buttonStyle(.plain)
            .help("Close editor panel (⌘E)")
            .accessibilityLabel("Close editor panel")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.sidebarBackground)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "note.text")
                .font(.system(size: 36, weight: .thin))
                .foregroundStyle(.textTertiary)

            VStack(spacing: 4) {
                Text("No task selected")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.textSecondary)
                Text("Click the note icon on any task to open its note here")
                    .font(.system(size: 11))
                    .foregroundStyle(.textTertiary)
                    .multilineTextAlignment(.center)
            }

            Text("⌘E  to close this panel")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(.textTertiary.opacity(0.7))
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }

    // MARK: - Logic

    private func loadContent() {
        if let proj = projectItem {
            // Use ProjectManager singleton so we read the real file
            content = ProjectManager().loadNote(for: proj)
        } else if let task = task {
            if let existing = notes.loadNote(for: task.id) {
                content = existing
            } else {
                content = notes.createNote(for: task)
            }
        }
        isSaved = true
    }

    private func scheduleAutosave(key: String, content: String) {
        saveDebounce?.cancel()
        saveDebounce = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            
            // Perform the file write off the Main Actor thread
            await Task.detached(priority: .utility) { [projectItem, task] in
                if let proj = projectItem {
                    ProjectManager().saveNote(for: proj, content: content)
                } else if let taskId = task?.id {
                    NoteManager.shared.saveNote(for: taskId, content: content)
                }
            }.value
            
            await MainActor.run {
                isSaved = true
            }
        }
    }

    // MARK: - Helpers

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "active":    return .googleBlue
        case "paused":    return .staleAmber
        case "completed": return .successGreen
        default:          return .textSecondary
        }
    }
}


// MARK: - NSTextView Wrapper

/// Wraps AppKit's NSTextView for SwiftUI, giving us a monospaced
/// markdown-friendly text editor with proper undo, find bar, and spell check.
struct MarkdownTextView: NSViewRepresentable {

    @Binding var text: String
    var onTextChange: (String) -> Void

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        guard let textView = scrollView.documentView as? NSTextView else {
            return scrollView
        }

        textView.delegate             = context.coordinator
        textView.isRichText           = false
        textView.isEditable           = true
        textView.isSelectable         = true
        textView.allowsUndo           = true
        textView.usesFindBar          = true
        textView.textContainerInset   = NSSize(width: 18, height: 18)
        textView.backgroundColor      = NSColor(Color.secondarySurface)
        textView.drawsBackground      = true

        // Disable auto-corrections that mangle markdown
        textView.isAutomaticQuoteSubstitutionEnabled   = false
        textView.isAutomaticDashSubstitutionEnabled    = false
        textView.isAutomaticSpellingCorrectionEnabled  = false
        textView.isContinuousSpellCheckingEnabled      = true

        applyTypography(to: textView)
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }
        // Only overwrite if the backing store changed externally (e.g. task switch).
        // Checking equality avoids resetting the cursor on every keystroke.
        if textView.string != text {
            textView.string = text
            applyTypography(to: textView)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(binding: $text, onTextChange: onTextChange)
    }

    // MARK: - Typography

    private func applyTypography(to textView: NSTextView) {
        let font  = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        let color = NSColor(Color.textPrimary)

        let para = NSMutableParagraphStyle()
        para.lineSpacing      = 5
        para.paragraphSpacing = 6

        textView.font                 = font
        textView.textColor            = color
        textView.defaultParagraphStyle = para
        textView.typingAttributes = [
            .font:           font,
            .foregroundColor: color,
            .paragraphStyle: para
        ]
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, NSTextViewDelegate {
        var binding:      Binding<String>
        let onTextChange: (String) -> Void

        init(binding: Binding<String>, onTextChange: @escaping (String) -> Void) {
            self.binding      = binding
            self.onTextChange = onTextChange
        }

        func textDidChange(_ notification: Notification) {
            guard let tv = notification.object as? NSTextView else { return }
            binding.wrappedValue = tv.string
            onTextChange(tv.string)
        }
    }
}

